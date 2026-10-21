import { computeOutstanding, computePaymentStatus } from "./status";
import type {
  MemberPosition,
  MemberSummary,
  RoundSummary,
  ValidPayment,
} from "./types";

/**
 * Builds one member's position in a round from their obligation and their
 * valid payments.
 */
export function buildMemberPosition(input: {
  memberId: string;
  fullName: string;
  slug: string;
  phoneNumber: string | null;
  expectedAmount: number | null;
  isApplicable: boolean;
  payments: ValidPayment[];
}): MemberPosition {
  const paidAmount = input.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );

  const status = computePaymentStatus({
    expectedAmount: input.expectedAmount,
    isApplicable: input.isApplicable,
    paidAmount,
  });

  const latestPaymentAt =
    input.payments.length === 0
      ? null
      : input.payments.reduce(
          (latest, payment) =>
            latest === null || payment.receivedAt > latest
              ? payment.receivedAt
              : latest,
          null as Date | null,
        );

  return {
    memberId: input.memberId,
    fullName: input.fullName,
    slug: input.slug,
    phoneNumber: input.phoneNumber,
    expectedAmount: input.expectedAmount ?? 0,
    isApplicable: input.isApplicable,
    paidAmount,
    outstanding: computeOutstanding({
      expectedAmount: input.expectedAmount,
      isApplicable: input.isApplicable,
      paidAmount,
    }),
    status,
    paymentCount: input.payments.length,
    latestPaymentAt,
  };
}

/**
 * Aggregates a round.
 *
 * Expected collection is the sum of the applicable obligations — never a
 * hardcoded target. Outstanding is the sum of each member's positive
 * outstanding balance.
 */
export function summariseRound(positions: MemberPosition[]): RoundSummary {
  let expectedTotal = 0;
  let collectedTotal = 0;
  let outstandingTotal = 0;
  let paidCount = 0;
  let partiallyPaidCount = 0;
  let pendingCount = 0;
  let overpaidCount = 0;
  let notApplicableCount = 0;

  for (const position of positions) {
    if (position.isApplicable) {
      expectedTotal += position.expectedAmount;
    }
    collectedTotal += position.paidAmount;
    outstandingTotal += position.outstanding;

    switch (position.status) {
      case "paid":
        paidCount += 1;
        break;
      case "partially_paid":
        partiallyPaidCount += 1;
        break;
      case "not_paid":
        pendingCount += 1;
        break;
      case "overpaid":
        overpaidCount += 1;
        break;
      case "not_applicable":
        notApplicableCount += 1;
        break;
    }
  }

  return {
    expectedTotal,
    collectedTotal,
    outstandingTotal,
    paidCount,
    partiallyPaidCount,
    pendingCount,
    overpaidCount,
    notApplicableCount,
    memberCount: positions.length,
    collectionProgress:
      expectedTotal > 0 ? collectedTotal / expectedTotal : 0,
  };
}

/**
 * Aggregates one member across every round, for the Members screen.
 */
export function summariseMember(input: {
  memberId: string;
  fullName: string;
  slug: string;
  phoneNumber: string | null;
  defaultContributionAmount: number;
  expectedTotal: number;
  payments: ValidPayment[];
}): MemberSummary {
  const collectedTotal = input.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );

  const latestPaymentAt =
    input.payments.length === 0
      ? null
      : input.payments.reduce(
          (latest, payment) =>
            latest === null || payment.receivedAt > latest
              ? payment.receivedAt
              : latest,
          null as Date | null,
        );

  return {
    memberId: input.memberId,
    fullName: input.fullName,
    slug: input.slug,
    phoneNumber: input.phoneNumber,
    defaultContributionAmount: input.defaultContributionAmount,
    expectedTotal: input.expectedTotal,
    collectedTotal,
    outstandingTotal: Math.max(0, input.expectedTotal - collectedTotal),
    paymentCount: input.payments.length,
    latestPaymentAt,
  };
}

/**
 * Orders members for the Collections screen: members who still owe money come
 * first, then by the size of the outstanding balance, then alphabetically.
 */
export function sortForCollection(positions: MemberPosition[]): MemberPosition[] {
  const rank: Record<MemberPosition["status"], number> = {
    not_paid: 0,
    partially_paid: 1,
    paid: 2,
    overpaid: 3,
    not_applicable: 4,
  };

  return [...positions].sort((a, b) => {
    if (rank[a.status] !== rank[b.status]) {
      return rank[a.status] - rank[b.status];
    }
    if (a.outstanding !== b.outstanding) {
      return b.outstanding - a.outstanding;
    }
    return a.fullName.localeCompare(b.fullName, "en-IN");
  });
}
