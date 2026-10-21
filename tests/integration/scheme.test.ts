/**
 * Scheme administration against the live database.
 *
 * Every test runs inside a transaction that is rolled back.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { updateMember } from "@/app/actions/members";
import { updateObligation } from "@/app/actions/obligations";
import { addPayoutRecipient, updatePayout } from "@/app/actions/payouts";
import { getRoundCollection } from "@/lib/data/collection";
import { inRolledBackTransaction, testPrisma } from "./helpers";

const sessionState = vi.hoisted(() => ({ enabled: true }));

vi.mock("next/cache", () => ({
  revalidatePath: () => {},
  revalidateTag: () => {},
  updateTag: () => {},
}));

vi.mock("next/headers", async () => {
  const { createSessionToken } = await import("@/lib/session");
  const { appConfig } = await import("@/config/app");

  const token = createSessionToken(
    {
      email: process.env.ADMIN_EMAIL ?? "admin@example.com",
      issuedAt: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000,
    },
    process.env.SESSION_SECRET ?? "",
  );

  return {
    cookies: async () => ({
      get: (name: string) =>
        sessionState.enabled && name === appConfig.sessionCookieName
          ? { name, value: token }
          : undefined,
      getAll: () =>
        sessionState.enabled
          ? [{ name: appConfig.sessionCookieName, value: token }]
          : [],
      set: () => {},
      delete: () => {},
      has: (name: string) =>
        sessionState.enabled && name === appConfig.sessionCookieName,
    }),
  };
});

async function fixture() {
  const december = await testPrisma.monthlyRound.findUnique({
    where: { year_month: { year: 2026, month: 12 } },
  });
  const march = await testPrisma.monthlyRound.findUnique({
    where: { year_month: { year: 2027, month: 3 } },
  });
  const fatima = await testPrisma.member.findUnique({
    where: { slug: "fatima" },
  });
  const hidayat = await testPrisma.member.findUnique({
    where: { slug: "hidayat" },
  });

  if (!december || !march || !fatima || !hidayat) {
    throw new Error("The test fixture is missing. Run `npm run db:seed` first.");
  }

  return { december, march, fatima, hidayat };
}

describe("member administration", () => {
  it("changes a member's default contribution without touching obligations", async () => {
    await inRolledBackTransaction(async (client) => {
      const { fatima } = await fixture();

      const before = await client.contributionObligation.findMany({
        where: { memberId: fatima.id },
        select: { expectedAmount: true },
      });

      const result = await updateMember({
        memberId: fatima.id,
        fullName: "Fatima",
        phoneNumber: "+91 98765 43210",
        defaultContributionRupees: 7000,
        isActive: true,
        notes: "",
      });

      expect(result.ok).toBe(true);

      const after = await client.contributionObligation.findMany({
        where: { memberId: fatima.id },
        select: { expectedAmount: true },
      });

      // The obligations are untouched, so historical rounds do not change.
      expect(after.map((row) => Number(row.expectedAmount))).toEqual(
        before.map((row) => Number(row.expectedAmount)),
      );

      const member = await client.member.findUnique({
        where: { id: fatima.id },
        select: { defaultContributionAmount: true },
      });
      expect(Number(member?.defaultContributionAmount)).toBe(700_000);
    });
  });

  it("writes an audit entry when a contribution changes", async () => {
    await inRolledBackTransaction(async (client) => {
      const { fatima } = await fixture();

      await updateMember({
        memberId: fatima.id,
        fullName: "Fatima",
        phoneNumber: "",
        defaultContributionRupees: 6500,
        isActive: true,
        notes: "",
      });

      const audit = await client.auditLog.findMany({
        where: { entityId: fatima.id, action: "member.updated" },
      });

      expect(audit.length).toBe(1);
      expect(audit[0].beforeData).toBeTruthy();
      expect(audit[0].afterData).toBeTruthy();
    });
  });
});

describe("obligation administration", () => {
  it("marks an obligation as not applicable", async () => {
    await inRolledBackTransaction(async (client) => {
      const { december, fatima } = await fixture();

      const obligation = await client.contributionObligation.findUnique({
        where: {
          roundId_memberId: { roundId: december.id, memberId: fatima.id },
        },
      });

      const result = await updateObligation({
        obligationId: obligation!.id,
        expectedRupees: 5000,
        isApplicable: false,
        notes: "Not contributing this month",
      });

      expect(result.ok).toBe(true);

      const collection = await getRoundCollection(december.id);
      const position = collection?.positions.find(
        (entry) => entry.memberId === fatima.id,
      );

      expect(position?.status).toBe("not_applicable");
      expect(position?.outstanding).toBe(0);

      // The expected total drops, because a not applicable obligation is excluded.
      const expected = collection?.summary.expectedTotal ?? 0;
      expect(expected).toBe(9_500_000);
    });
  });
});

describe("payout administration", () => {
  it("supports several recipients in one month with different amounts", async () => {
    await inRolledBackTransaction(async (client) => {
      const { march, hidayat } = await fixture();

      const marchPayouts = await client.payout.findMany({
        where: { roundId: march.id },
        select: { recipientMemberId: true, plannedAmount: true },
      });

      expect(marchPayouts.length).toBe(3);

      const total = marchPayouts.reduce(
        (sum, payout) => sum + Number(payout.plannedAmount),
        0,
      );
      expect(total).toBe(1_000_000);

      // The amounts are not all equal.
      const amounts = new Set(
        marchPayouts.map((payout) => Number(payout.plannedAmount)),
      );
      expect(amounts.size).toBeGreaterThan(1);

      // A fourth recipient can be scheduled.
      const result = await addPayoutRecipient({
        roundId: march.id,
        memberId: hidayat.id,
        plannedRupees: 3000,
      });

      expect(result.ok).toBe(true);

      const after = await client.payout.count({ where: { roundId: march.id } });
      expect(after).toBe(4);
    });
  });

  it("records the actual amount separately from the planned amount", async () => {
    await inRolledBackTransaction(async (client) => {
      const { march } = await fixture();

      const payout = await client.payout.findFirst({
        where: { roundId: march.id },
      });

      const result = await updatePayout({
        payoutId: payout!.id,
        plannedRupees: 5000,
        actualRupees: 4800,
        status: "paid",
        paidAt: "2027-03-28T11:00",
        transactionReference: "NEFT-99",
        note: "Paid one day late",
      });

      expect(result.ok).toBe(true);

      const updated = await client.payout.findUnique({
        where: { id: payout!.id },
      });

      expect(Number(updated?.plannedAmount)).toBe(500_000);
      expect(Number(updated?.actualAmount)).toBe(480_000);
      expect(updated?.status).toBe("paid");
      expect(updated?.paidAt?.toISOString()).toBe("2027-03-28T05:30:00.000Z");
    });
  });
});

describe("the seed script", () => {
  it("is idempotent when run again", async () => {
    await inRolledBackTransaction(async (client) => {
      const seedSql = await readFile(
        path.join(process.cwd(), "supabase", "seed.sql"),
        "utf8",
      );

      const before = {
        members: await client.member.count(),
        rounds: await client.monthlyRound.count(),
        obligations: await client.contributionObligation.count(),
        payouts: await client.payout.count(),
      };

      await client.$executeRawUnsafe(seedSql);

      const after = {
        members: await client.member.count(),
        rounds: await client.monthlyRound.count(),
        obligations: await client.contributionObligation.count(),
        payouts: await client.payout.count(),
      };

      expect(after).toEqual(before);
      expect(after.members).toBe(17);
      expect(after.rounds).toBe(10);
      expect(after.obligations).toBe(170);
      expect(after.payouts).toBe(19);
    });
  });
});
