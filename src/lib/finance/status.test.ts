import { describe, expect, it } from "vitest";
import { computeOutstanding, computePaymentStatus, isOutstanding } from "./status";

const FIVE_THOUSAND = 500_000;
const TWO_THOUSAND_FIVE_HUNDRED = 250_000;

describe("computePaymentStatus", () => {
  it("reports a member with no payment as not paid", () => {
    expect(
      computePaymentStatus({
        expectedAmount: FIVE_THOUSAND,
        isApplicable: true,
        paidAmount: 0,
      }),
    ).toBe("not_paid");
  });

  it("reports a member who paid the full amount as paid", () => {
    expect(
      computePaymentStatus({
        expectedAmount: FIVE_THOUSAND,
        isApplicable: true,
        paidAmount: FIVE_THOUSAND,
      }),
    ).toBe("paid");
  });

  it("reports a member who paid part of the amount as partially paid", () => {
    expect(
      computePaymentStatus({
        expectedAmount: FIVE_THOUSAND,
        isApplicable: true,
        paidAmount: TWO_THOUSAND_FIVE_HUNDRED,
      }),
    ).toBe("partially_paid");
  });

  it("reports a member who paid more than expected as overpaid", () => {
    expect(
      computePaymentStatus({
        expectedAmount: FIVE_THOUSAND,
        isApplicable: true,
        paidAmount: FIVE_THOUSAND + 1,
      }),
    ).toBe("overpaid");
  });

  it("reports a member with no obligation as not applicable", () => {
    expect(
      computePaymentStatus({
        expectedAmount: null,
        isApplicable: true,
        paidAmount: 0,
      }),
    ).toBe("not_applicable");
  });

  it("reports a member whose obligation is not applicable as not applicable", () => {
    expect(
      computePaymentStatus({
        expectedAmount: FIVE_THOUSAND,
        isApplicable: false,
        paidAmount: 0,
      }),
    ).toBe("not_applicable");
  });

  it("treats a fulfilled zero obligation as paid", () => {
    expect(
      computePaymentStatus({
        expectedAmount: 0,
        isApplicable: true,
        paidAmount: 0,
      }),
    ).toBe("paid");
  });

  it("follows the plan's worked example for Fatima", () => {
    // Fatima owes Rs 5,000 and pays Rs 2,500 -> partially paid, Rs 2,500 left.
    const halfway = computePaymentStatus({
      expectedAmount: FIVE_THOUSAND,
      isApplicable: true,
      paidAmount: TWO_THOUSAND_FIVE_HUNDRED,
    });
    expect(halfway).toBe("partially_paid");
    expect(
      computeOutstanding({
        expectedAmount: FIVE_THOUSAND,
        isApplicable: true,
        paidAmount: TWO_THOUSAND_FIVE_HUNDRED,
      }),
    ).toBe(TWO_THOUSAND_FIVE_HUNDRED);

    // She pays the remaining Rs 2,500 -> paid, and nothing is outstanding.
    const complete = computePaymentStatus({
      expectedAmount: FIVE_THOUSAND,
      isApplicable: true,
      paidAmount: TWO_THOUSAND_FIVE_HUNDRED + TWO_THOUSAND_FIVE_HUNDRED,
    });
    expect(complete).toBe("paid");
    expect(
      computeOutstanding({
        expectedAmount: FIVE_THOUSAND,
        isApplicable: true,
        paidAmount: TWO_THOUSAND_FIVE_HUNDRED + TWO_THOUSAND_FIVE_HUNDRED,
      }),
    ).toBe(0);
  });
});

describe("computeOutstanding", () => {
  it("is zero for a member with no obligation", () => {
    expect(
      computeOutstanding({
        expectedAmount: null,
        isApplicable: true,
        paidAmount: 0,
      }),
    ).toBe(0);
  });

  it("is zero for a not applicable member", () => {
    expect(
      computeOutstanding({
        expectedAmount: FIVE_THOUSAND,
        isApplicable: false,
        paidAmount: 0,
      }),
    ).toBe(0);
  });

  it("never goes negative for an overpaid member", () => {
    expect(
      computeOutstanding({
        expectedAmount: FIVE_THOUSAND,
        isApplicable: true,
        paidAmount: FIVE_THOUSAND + 100_000,
      }),
    ).toBe(0);
  });
});

describe("isOutstanding", () => {
  it("is true only for not paid and partially paid", () => {
    expect(isOutstanding("not_paid")).toBe(true);
    expect(isOutstanding("partially_paid")).toBe(true);
    expect(isOutstanding("paid")).toBe(false);
    expect(isOutstanding("overpaid")).toBe(false);
    expect(isOutstanding("not_applicable")).toBe(false);
  });
});
