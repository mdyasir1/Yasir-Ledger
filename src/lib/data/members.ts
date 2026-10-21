import { prisma } from "@/lib/db";
import { toNumber } from "./rounds";

export type MemberRow = {
  id: string;
  slug: string;
  fullName: string;
  phoneNumber: string | null;
  defaultContributionAmount: number;
  isActive: boolean;
  notes: string | null;
  expectedTotal: number;
  collectedTotal: number;
  outstandingTotal: number;
  paymentCount: number;
  lastPaymentAt: Date | null;
  /** Outstanding per round, for the member detail view. */
  roundBalances: Array<{
    roundId: string;
    roundName: string;
    expected: number;
    paid: number;
    outstanding: number;
  }>;
};

/**
 * Every member with their position across the whole scheme.
 *
 * Only valid payments count towards the collected total: reversed payments and
 * reversal entries are excluded.
 */
export async function getMemberRows(): Promise<MemberRow[]> {
  const members = await prisma.member.findMany({
    orderBy: { fullName: "asc" },
  });

  const obligations = await prisma.contributionObligation.findMany({
    include: { round: { select: { id: true, roundName: true } } },
  });

  const payments = await prisma.payment.findMany({
    include: { reversedBy: { select: { id: true } } },
  });

  const validPayments = payments.filter(
    (payment) =>
      payment.reversalOfPaymentId === null && payment.reversedBy.length === 0,
  );

  return members.map((member) => {
    const memberObligations = obligations.filter(
      (obligation) => obligation.memberId === member.id,
    );
    const memberPayments = validPayments.filter(
      (payment) => payment.memberId === member.id,
    );

    const collectedTotal = memberPayments.reduce(
      (sum, payment) => sum + toNumber(payment.amount),
      0,
    );
    const expectedTotal = memberObligations
      .filter((obligation) => obligation.isApplicable)
      .reduce((sum, obligation) => sum + toNumber(obligation.expectedAmount), 0);

    const roundBalances = memberObligations
      .map((obligation) => {
        const expected = toNumber(obligation.expectedAmount);
        const paid = memberPayments
          .filter((payment) => payment.roundId === obligation.roundId)
          .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

        return {
          roundId: obligation.round.id,
          roundName: obligation.round.roundName,
          expected,
          paid,
          outstanding: Math.max(0, expected - paid),
        };
      })
      .sort((a, b) => a.roundName.localeCompare(b.roundName, "en-IN"));

    const lastPaymentAt =
      memberPayments.length === 0
        ? null
        : memberPayments.reduce(
            (latest, payment) =>
              latest === null || payment.receivedAt > latest
                ? payment.receivedAt
                : latest,
            null as Date | null,
          );

    return {
      id: member.id,
      slug: member.slug,
      fullName: member.fullName,
      phoneNumber: member.phoneNumber,
      defaultContributionAmount: toNumber(member.defaultContributionAmount),
      isActive: member.isActive,
      notes: member.notes,
      expectedTotal,
      collectedTotal,
      outstandingTotal: Math.max(0, expectedTotal - collectedTotal),
      paymentCount: memberPayments.length,
      lastPaymentAt,
      roundBalances,
    };
  });
}
