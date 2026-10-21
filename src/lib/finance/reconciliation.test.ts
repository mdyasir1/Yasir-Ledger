import { describe, expect, it } from "vitest";
import { reconcileRound } from "./reconciliation";
import type { MemberPosition, RoundSummary } from "./types";

function summary(overrides: Partial<RoundSummary> = {}): RoundSummary {
  return {
    expectedTotal: 10_000_000,
    collectedTotal: 10_000_000,
    outstandingTotal: 0,
    paidCount: 17,
    partiallyPaidCount: 0,
    pendingCount: 0,
    overpaidCount: 0,
    notApplicableCount: 0,
    memberCount: 17,
    collectionProgress: 1,
    ...overrides,
  };
}

const noPositions: MemberPosition[] = [];

describe("reconcileRound", () => {
  it("reports nothing for a perfectly balanced round", () => {
    const warnings = reconcileRound({
      summary: summary(),
      positions: noPositions,
      plannedPayoutTotal: 1_000_000,
      actualPayoutTotal: 0,
      isRoundOpen: true,
    });

    expect(warnings).toHaveLength(0);
  });

  it("reports a short collection as information while the round is open", () => {
    const warnings = reconcileRound({
      summary: summary({ collectedTotal: 6_000_000, outstandingTotal: 4_000_000 }),
      positions: noPositions,
      plannedPayoutTotal: 1_000_000,
      actualPayoutTotal: 0,
      isRoundOpen: true,
    });

    const short = warnings.find((warning) => warning.code === "collection_short");
    expect(short).toBeDefined();
    expect(short?.severity).toBe("info");
  });

  it("reports a short collection as critical once the round is closed", () => {
    const warnings = reconcileRound({
      summary: summary({ collectedTotal: 6_000_000, outstandingTotal: 4_000_000 }),
      positions: noPositions,
      plannedPayoutTotal: 1_000_000,
      actualPayoutTotal: 0,
      isRoundOpen: false,
    });

    const short = warnings.find((warning) => warning.code === "collection_short");
    expect(short?.severity).toBe("critical");
  });

  it("flags a payout larger than the collection as critical", () => {
    const warnings = reconcileRound({
      summary: summary({ collectedTotal: 5_000_000, outstandingTotal: 5_000_000 }),
      positions: noPositions,
      plannedPayoutTotal: 5_000_000,
      actualPayoutTotal: 6_000_000,
      isRoundOpen: true,
    });

    const critical = warnings.find(
      (warning) => warning.code === "payout_exceeds_collection",
    );
    expect(critical?.severity).toBe("critical");
  });

  it("flags a planned payout larger than the collection", () => {
    const warnings = reconcileRound({
      summary: summary({ collectedTotal: 5_000_000, outstandingTotal: 5_000_000 }),
      positions: noPositions,
      plannedPayoutTotal: 8_000_000,
      actualPayoutTotal: 0,
      isRoundOpen: true,
    });

    expect(
      warnings.some(
        (warning) => warning.code === "planned_payout_exceeds_collection",
      ),
    ).toBe(true);
  });

  it("flags an actual payout above the planned payout", () => {
    const warnings = reconcileRound({
      summary: summary(),
      positions: noPositions,
      plannedPayoutTotal: 1_000_000,
      actualPayoutTotal: 1_500_000,
      isRoundOpen: true,
    });

    expect(
      warnings.some((warning) => warning.code === "actual_exceeds_planned"),
    ).toBe(true);
  });

  it("flags a collection that exceeds the expected amount", () => {
    const warnings = reconcileRound({
      summary: summary({ collectedTotal: 11_000_000 }),
      positions: noPositions,
      plannedPayoutTotal: 1_000_000,
      actualPayoutTotal: 0,
      isRoundOpen: true,
    });

    expect(
      warnings.some((warning) => warning.code === "collection_over_expected"),
    ).toBe(true);
  });

  it("mentions members who overpaid", () => {
    const overpaidPosition = {
      memberId: "m1",
      fullName: "Over",
      slug: "over",
      phoneNumber: null,
      expectedAmount: 1_000,
      isApplicable: true,
      paidAmount: 2_000,
      outstanding: 0,
      status: "overpaid" as const,
      paymentCount: 1,
      latestPaymentAt: null,
    };

    const warnings = reconcileRound({
      summary: summary(),
      positions: [overpaidPosition],
      plannedPayoutTotal: 1_000,
      actualPayoutTotal: 0,
      isRoundOpen: true,
    });

    const warning = warnings.find((entry) => entry.code === "member_overpaid");
    expect(warning?.message).toContain("1 member");
  });
});
