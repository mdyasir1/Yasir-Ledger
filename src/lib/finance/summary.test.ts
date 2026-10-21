import { describe, expect, it } from "vitest";
import {
  buildMemberPosition,
  sortForCollection,
  summariseMember,
  summariseRound,
} from "./summary";
import type { ValidPayment } from "./types";

function payment(
  id: string,
  memberId: string,
  amount: number,
  receivedAt = new Date("2026-10-05T10:00:00Z"),
): ValidPayment {
  return {
    id,
    memberId,
    amount,
    receivedAt,
    paymentMethod: "upi",
    transactionReference: null,
    note: null,
  };
}

const FATIMA_EXPECTED = 500_000;

describe("buildMemberPosition", () => {
  it("sums multiple payments by the same member", () => {
    const position = buildMemberPosition({
      memberId: "m-fatima",
      fullName: "Fatima",
      slug: "fatima",
      phoneNumber: null,
      expectedAmount: FATIMA_EXPECTED,
      isApplicable: true,
      payments: [
        payment("p1", "m-fatima", 250_000),
        payment("p2", "m-fatima", 250_000),
      ],
    });

    expect(position.paidAmount).toBe(FATIMA_EXPECTED);
    expect(position.status).toBe("paid");
    expect(position.outstanding).toBe(0);
    expect(position.paymentCount).toBe(2);
  });

  it("keeps a partial payment outstanding", () => {
    const position = buildMemberPosition({
      memberId: "m-fatima",
      fullName: "Fatima",
      slug: "fatima",
      phoneNumber: null,
      expectedAmount: FATIMA_EXPECTED,
      isApplicable: true,
      payments: [payment("p1", "m-fatima", 200_000)],
    });

    expect(position.status).toBe("partially_paid");
    expect(position.outstanding).toBe(300_000);
  });

  it("records the latest payment date", () => {
    const position = buildMemberPosition({
      memberId: "m-fatima",
      fullName: "Fatima",
      slug: "fatima",
      phoneNumber: null,
      expectedAmount: FATIMA_EXPECTED,
      isApplicable: true,
      payments: [
        payment("p1", "m-fatima", 100_000, new Date("2026-10-05T10:00:00Z")),
        payment("p2", "m-fatima", 100_000, new Date("2026-10-09T18:30:00Z")),
      ],
    });

    expect(position.latestPaymentAt?.toISOString()).toBe(
      "2026-10-09T18:30:00.000Z",
    );
  });

  it("has no latest payment date when nothing was paid", () => {
    const position = buildMemberPosition({
      memberId: "m-fatima",
      fullName: "Fatima",
      slug: "fatima",
      phoneNumber: null,
      expectedAmount: FATIMA_EXPECTED,
      isApplicable: true,
      payments: [],
    });

    expect(position.latestPaymentAt).toBeNull();
    expect(position.status).toBe("not_paid");
  });
});

describe("summariseRound", () => {
  const positions = [
    buildMemberPosition({
      memberId: "m1",
      fullName: "Paid",
      slug: "paid",
      phoneNumber: null,
      expectedAmount: 1_000_000,
      isApplicable: true,
      payments: [payment("p1", "m1", 1_000_000)],
    }),
    buildMemberPosition({
      memberId: "m2",
      fullName: "Partial",
      slug: "partial",
      phoneNumber: null,
      expectedAmount: 1_000_000,
      isApplicable: true,
      payments: [payment("p2", "m2", 400_000)],
    }),
    buildMemberPosition({
      memberId: "m3",
      fullName: "Pending",
      slug: "pending",
      phoneNumber: null,
      expectedAmount: 1_000_000,
      isApplicable: true,
      payments: [],
    }),
    buildMemberPosition({
      memberId: "m4",
      fullName: "Over",
      slug: "over",
      phoneNumber: null,
      expectedAmount: 1_000_000,
      isApplicable: true,
      payments: [payment("p3", "m4", 1_200_000)],
    }),
    buildMemberPosition({
      memberId: "m5",
      fullName: "Skipped",
      slug: "skipped",
      phoneNumber: null,
      expectedAmount: null,
      isApplicable: false,
      payments: [],
    }),
  ];

  it("adds up the round totals", () => {
    const summary = summariseRound(positions);

    expect(summary.expectedTotal).toBe(4_000_000);
    expect(summary.collectedTotal).toBe(2_600_000);
    // Partial (600,000) + Pending (1,000,000). Paid and Overpaid add nothing.
    expect(summary.outstandingTotal).toBe(1_600_000);
    expect(summary.memberCount).toBe(5);
  });

  it("counts each status", () => {
    const summary = summariseRound(positions);

    expect(summary.paidCount).toBe(1);
    expect(summary.partiallyPaidCount).toBe(1);
    expect(summary.pendingCount).toBe(1);
    expect(summary.overpaidCount).toBe(1);
    expect(summary.notApplicableCount).toBe(1);
  });

  it("computes the collection progress", () => {
    expect(summariseRound(positions).collectionProgress).toBeCloseTo(0.65);
  });

  it("reports zero progress when nothing is expected", () => {
    const summary = summariseRound([]);
    expect(summary.collectionProgress).toBe(0);
    expect(summary.expectedTotal).toBe(0);
  });

  it("sums only positive outstanding balances", () => {
    const summary = summariseRound(positions);
    // The overpaid member contributes 0 outstanding, not a negative number.
    expect(summary.outstandingTotal).toBe(1_600_000);
  });
});

describe("summariseMember", () => {
  it("totals a member's contributions across the scheme", () => {
    const summary = summariseMember({
      memberId: "m1",
      fullName: "Yasir",
      slug: "yasir",
      phoneNumber: null,
      defaultContributionAmount: 1_000_000,
      expectedTotal: 10_000_000,
      payments: [
        payment("p1", "m1", 1_000_000),
        payment("p2", "m1", 1_000_000),
        payment("p3", "m1", 1_000_000),
      ],
    });

    expect(summary.collectedTotal).toBe(3_000_000);
    expect(summary.outstandingTotal).toBe(7_000_000);
    expect(summary.paymentCount).toBe(3);
  });
});

describe("sortForCollection", () => {
  it("puts members who owe money first", () => {
    const positions = [
      buildMemberPosition({
        memberId: "m1",
        fullName: "Paid",
        slug: "paid",
        phoneNumber: null,
        expectedAmount: 1_000,
        isApplicable: true,
        payments: [payment("p1", "m1", 1_000)],
      }),
      buildMemberPosition({
        memberId: "m2",
        fullName: "Pending",
        slug: "pending",
        phoneNumber: null,
        expectedAmount: 1_000,
        isApplicable: true,
        payments: [],
      }),
      buildMemberPosition({
        memberId: "m3",
        fullName: "Partial",
        slug: "partial",
        phoneNumber: null,
        expectedAmount: 1_000,
        isApplicable: true,
        payments: [payment("p2", "m3", 400)],
      }),
    ];

    const sorted = sortForCollection(positions);
    expect(sorted.map((position) => position.slug)).toEqual([
      "pending",
      "partial",
      "paid",
    ]);
  });
});
