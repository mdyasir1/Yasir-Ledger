/**
 * Payment operations against the live database.
 *
 * Every test runs inside a transaction that is rolled back, so the
 * administrator's real data is untouched.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
import { recordPayment, reversePayment } from "@/app/actions/payments";
import { getRoundCollection } from "@/lib/data/collection";
import { inRolledBackTransaction, testPrisma } from "./helpers";

/** Allows a test to simulate an expired or missing session. */
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

const TEST_ROUND_NAME = "Test Round (transient)";
const TEST_YEAR = 2098;
const TEST_MONTH = 1;

/**
 * Builds a throwaway round with a single obligation.
 *
 * The tests must not depend on what the administrator has already recorded, so
 * they work inside a round of their own. It is created inside the transaction
 * that is rolled back, so it never exists in the committed database.
 */
async function fixture(client: PrismaClient) {
  const fatima = await testPrisma.member.findUnique({
    where: { slug: "fatima" },
  });
  const khaise = await testPrisma.member.findUnique({
    where: { slug: "khaise" },
  });

  if (!fatima || !khaise) {
    throw new Error("The test fixture is missing. Run `npm run db:seed` first.");
  }

  // Remove a leftover of a previous run, if there is one.
  await client.monthlyRound.deleteMany({ where: { roundName: TEST_ROUND_NAME } });

  const round = await client.monthlyRound.create({
    data: {
      year: TEST_YEAR,
      month: TEST_MONTH,
      roundName: TEST_ROUND_NAME,
      collectionTarget: 10_000_000n,
      status: "open",
      obligations: {
        create: [
          { memberId: fatima.id, expectedAmount: 500_000n, isApplicable: true },
        ],
      },
    },
  });

  return { round, fatima, khaise };
}

beforeEach(() => {
  sessionState.enabled = true;
});

describe("recordPayment", () => {
  it("records a full payment and marks the member as paid", async () => {
    await inRolledBackTransaction(async (client) => {
      const { round, fatima } = await fixture(client);

      const result = await recordPayment({
        roundId: round.id,
        memberId: fatima.id,
        amountRupees: 5000,
        paymentMethod: "upi",
        receivedAt: "2026-10-05T10:30",
        transactionReference: "UPI-123",
        note: "",
        idempotencyKey: "test-full-payment",
      });

      expect(result.ok).toBe(true);

      const collection = await getRoundCollection(round.id);
      const position = collection?.positions.find(
        (entry) => entry.memberId === fatima.id,
      );

      expect(position?.status).toBe("paid");
      expect(position?.paidAmount).toBe(500_000);
      expect(position?.outstanding).toBe(0);
      expect(collection?.summary.collectedTotal).toBe(500_000);
    });
  });

  it("records a partial payment and leaves the rest outstanding", async () => {
    await inRolledBackTransaction(async (client) => {
      const { round, fatima } = await fixture(client);

      await recordPayment({
        roundId: round.id,
        memberId: fatima.id,
        amountRupees: 2500,
        paymentMethod: "cash",
        receivedAt: "2026-10-05T10:30",
        transactionReference: "",
        note: "",
        idempotencyKey: "test-partial-1",
      });

      const collection = await getRoundCollection(round.id);
      const position = collection?.positions.find(
        (entry) => entry.memberId === fatima.id,
      );

      expect(position?.status).toBe("partially_paid");
      expect(position?.paidAmount).toBe(250_000);
      expect(position?.outstanding).toBe(250_000);
    });
  });

  it("keeps multiple payments by the same member as separate transactions", async () => {
    await inRolledBackTransaction(async (client) => {
      const { round, fatima } = await fixture(client);

      await recordPayment({
        roundId: round.id,
        memberId: fatima.id,
        amountRupees: 2500,
        paymentMethod: "upi",
        receivedAt: "2026-10-05T10:30",
        transactionReference: "",
        note: "",
        idempotencyKey: "test-multi-1",
      });

      await recordPayment({
        roundId: round.id,
        memberId: fatima.id,
        amountRupees: 2500,
        paymentMethod: "upi",
        receivedAt: "2026-10-12T18:00",
        transactionReference: "",
        note: "",
        idempotencyKey: "test-multi-2",
      });

      const collection = await getRoundCollection(round.id);
      const position = collection?.positions.find(
        (entry) => entry.memberId === fatima.id,
      );

      expect(position?.status).toBe("paid");
      expect(position?.paymentCount).toBe(2);
      expect(position?.paidAmount).toBe(500_000);
      expect(position?.outstanding).toBe(0);
    });
  });

  it("records an overpayment without creating a negative balance", async () => {
    await inRolledBackTransaction(async (client) => {
      const { round, fatima } = await fixture(client);

      await recordPayment({
        roundId: round.id,
        memberId: fatima.id,
        amountRupees: 6000,
        paymentMethod: "upi",
        receivedAt: "2026-10-05T10:30",
        transactionReference: "",
        note: "",
        idempotencyKey: "test-overpay",
      });

      const collection = await getRoundCollection(round.id);
      const position = collection?.positions.find(
        (entry) => entry.memberId === fatima.id,
      );

      expect(position?.status).toBe("overpaid");
      expect(position?.paidAmount).toBe(600_000);
      expect(position?.outstanding).toBe(0);
    });
  });

  it("ignores a repeated submission with the same idempotency key", async () => {
    await inRolledBackTransaction(async (client) => {
      const { round, fatima } = await fixture(client);

      const first = await recordPayment({
        roundId: round.id,
        memberId: fatima.id,
        amountRupees: 5000,
        paymentMethod: "upi",
        receivedAt: "2026-10-05T10:30",
        transactionReference: "",
        note: "",
        idempotencyKey: "test-duplicate",
      });

      const second = await recordPayment({
        roundId: round.id,
        memberId: fatima.id,
        amountRupees: 5000,
        paymentMethod: "upi",
        receivedAt: "2026-10-05T10:30",
        transactionReference: "",
        note: "",
        idempotencyKey: "test-duplicate",
      });

      expect(first.ok).toBe(true);
      expect(second.ok).toBe(true);
      if (first.ok && second.ok) {
        expect(second.data.duplicate).toBe(true);
        expect(second.data.paymentId).toBe(first.data.paymentId);
      }

      const count = await client.payment.count({
        where: { idempotencyKey: "test-duplicate" },
      });
      expect(count).toBe(1);
    });
  });

  it("stores the entered date in Asia/Kolkata", async () => {
    await inRolledBackTransaction(async (client) => {
      const { round, khaise } = await fixture(client);

      const result = await recordPayment({
        roundId: round.id,
        memberId: khaise.id,
        amountRupees: 2500,
        paymentMethod: "bank_transfer",
        receivedAt: "2026-10-05T10:30",
        transactionReference: "",
        note: "",
        idempotencyKey: "test-historical",
      });

      expect(result.ok).toBe(true);

      const payment = await client.payment.findUnique({
        where: { idempotencyKey: "test-historical" },
      });

      // 5 October 2026, 10:30 in Asia/Kolkata is 05:00 UTC.
      expect(payment?.receivedAt.toISOString()).toBe("2026-10-05T05:00:00.000Z");
    });
  });

  it("rejects a zero or negative amount without writing anything", async () => {
    await inRolledBackTransaction(async (client) => {
      const { round, fatima } = await fixture(client);

      const result = await recordPayment({
        roundId: round.id,
        memberId: fatima.id,
        amountRupees: 0,
        paymentMethod: "upi",
        receivedAt: "2026-10-05T10:30",
        transactionReference: "",
        note: "",
        idempotencyKey: "test-zero",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/greater than zero/i);
      }

      const count = await client.payment.count({
        where: { idempotencyKey: "test-zero" },
      });
      expect(count).toBe(0);
    });
  });

  it("rejects an invalid date without writing anything", async () => {
    await inRolledBackTransaction(async (client) => {
      const { round, fatima } = await fixture(client);

      const result = await recordPayment({
        roundId: round.id,
        memberId: fatima.id,
        amountRupees: 100,
        paymentMethod: "upi",
        receivedAt: "not-a-date",
        transactionReference: "",
        note: "",
        idempotencyKey: "test-bad-date",
      });

      expect(result.ok).toBe(false);

      const count = await client.payment.count({
        where: { idempotencyKey: "test-bad-date" },
      });
      expect(count).toBe(0);
    });
  });

  it("records a historical transaction in the real October 2026 round", async () => {
    await inRolledBackTransaction(async (client) => {
      // The genuine October round, so the requirement is covered end to end.
      const october = await client.monthlyRound.findUnique({
        where: { year_month: { year: 2026, month: 10 } },
      });
      const khaise = await testPrisma.member.findUnique({
        where: { slug: "khaise" },
      });

      if (!october || !khaise) {
        throw new Error("The test fixture is missing. Run `npm run db:seed` first.");
      }

      const result = await recordPayment({
        roundId: october.id,
        memberId: khaise.id,
        amountRupees: 2500,
        paymentMethod: "cash",
        receivedAt: "2026-10-03T09:15",
        transactionReference: "CASH-OCT",
        note: "",
        idempotencyKey: "test-historical-october",
      });

      expect(result.ok).toBe(true);

      const payment = await client.payment.findUnique({
        where: { idempotencyKey: "test-historical-october" },
      });

      // 3 October 2026, 09:15 in Asia/Kolkata is 03:45 UTC.
      expect(payment?.receivedAt.toISOString()).toBe("2026-10-03T03:45:00.000Z");
      expect(payment?.roundId).toBe(october.id);

      // It appears in that round's ledger.
      const collection = await getRoundCollection(october.id);
      const inLedger = collection?.payments.find(
        (entry) => entry.id === payment?.id,
      );

      expect(inLedger).toBeDefined();
      expect(inLedger?.roundId).toBe(october.id);
      expect(inLedger?.memberName).toBe("Khaise");
      expect(inLedger?.isValid).toBe(true);
    });
  });

  it("refuses to record a payment without a valid session", async () => {
    await inRolledBackTransaction(async (client) => {
      const { round, fatima } = await fixture(client);
      sessionState.enabled = false;

      const result = await recordPayment({
        roundId: round.id,
        memberId: fatima.id,
        amountRupees: 5000,
        paymentMethod: "upi",
        receivedAt: "2026-10-05T10:30",
        transactionReference: "",
        note: "",
        idempotencyKey: "test-unauthorised",
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toMatch(/session/i);
      }

      const count = await client.payment.count({
        where: { idempotencyKey: "test-unauthorised" },
      });
      expect(count).toBe(0);

      sessionState.enabled = true;
    });
  });
});

describe("reversePayment", () => {
  it("excludes a reversed payment from the collection total", async () => {
    await inRolledBackTransaction(async (client) => {
      const { round, fatima } = await fixture(client);

      const recorded = await recordPayment({
        roundId: round.id,
        memberId: fatima.id,
        amountRupees: 5000,
        paymentMethod: "upi",
        receivedAt: "2026-10-05T10:30",
        transactionReference: "",
        note: "",
        idempotencyKey: "test-reverse-original",
      });

      expect(recorded.ok).toBe(true);
      if (!recorded.ok) return;

      const before = await getRoundCollection(round.id);
      expect(before?.summary.collectedTotal).toBe(500_000);

      const reversal = await reversePayment({
        paymentId: recorded.data.paymentId,
        reason: "Entered against the wrong member",
      });

      expect(reversal.ok).toBe(true);

      const after = await getRoundCollection(round.id);
      const position = after?.positions.find(
        (entry) => entry.memberId === fatima.id,
      );

      // The original and the reversal are both excluded from the totals.
      expect(after?.summary.collectedTotal).toBe(0);
      expect(position?.status).toBe("not_paid");
      expect(position?.outstanding).toBe(500_000);

      // Both transactions stay visible in the ledger.
      expect(after?.payments.length).toBe(2);
      expect(after?.payments.filter((payment) => payment.isValid)).toHaveLength(0);
      expect(after?.payments.filter((payment) => payment.isReversed)).toHaveLength(1);
      expect(after?.payments.filter((payment) => payment.isReversal)).toHaveLength(1);
    });
  });

  it("writes an audit entry for the reversal", async () => {
    await inRolledBackTransaction(async (client) => {
      const { round, fatima } = await fixture(client);

      const recorded = await recordPayment({
        roundId: round.id,
        memberId: fatima.id,
        amountRupees: 5000,
        paymentMethod: "upi",
        receivedAt: "2026-10-05T10:30",
        transactionReference: "",
        note: "",
        idempotencyKey: "test-reverse-audit",
      });

      if (!recorded.ok) throw new Error("Payment could not be recorded.");

      await reversePayment({
        paymentId: recorded.data.paymentId,
        reason: "Duplicate entry",
      });

      const audit = await client.auditLog.findMany({
        where: { entityId: recorded.data.paymentId },
      });

      expect(audit.length).toBeGreaterThanOrEqual(1);
      expect(audit.map((entry) => entry.action)).toContain("payment.reversed");
    });
  });

  it("refuses to reverse the same payment twice", async () => {
    await inRolledBackTransaction(async (client) => {
      const { round, fatima } = await fixture(client);

      const recorded = await recordPayment({
        roundId: round.id,
        memberId: fatima.id,
        amountRupees: 5000,
        paymentMethod: "upi",
        receivedAt: "2026-10-05T10:30",
        transactionReference: "",
        note: "",
        idempotencyKey: "test-reverse-twice",
      });

      if (!recorded.ok) throw new Error("Payment could not be recorded.");

      await reversePayment({
        paymentId: recorded.data.paymentId,
        reason: "First reversal",
      });

      const second = await reversePayment({
        paymentId: recorded.data.paymentId,
        reason: "Second reversal",
      });

      expect(second.ok).toBe(false);
      if (!second.ok) {
        expect(second.error).toMatch(/already been reversed/i);
      }
    });
  });

  it("refuses to reverse a payment without a valid session", async () => {
    await inRolledBackTransaction(async (client) => {
      const { round, fatima } = await fixture(client);

      const recorded = await recordPayment({
        roundId: round.id,
        memberId: fatima.id,
        amountRupees: 5000,
        paymentMethod: "upi",
        receivedAt: "2026-10-05T10:30",
        transactionReference: "",
        note: "",
        idempotencyKey: "test-reverse-unauthorised",
      });

      if (!recorded.ok) throw new Error("Payment could not be recorded.");

      sessionState.enabled = false;

      const result = await reversePayment({
        paymentId: recorded.data.paymentId,
        reason: "",
      });

      expect(result.ok).toBe(false);
      sessionState.enabled = true;
    });
  });
});
