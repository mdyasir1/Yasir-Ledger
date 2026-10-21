import { prisma } from "@/lib/db";
import { computeOutstanding, computePaymentStatus } from "@/lib/finance/status";
import { toNumber } from "./rounds";

export type TimelineRecipient = {
  id: string;
  memberId: string;
  fullName: string;
  plannedAmount: number;
  actualAmount: number | null;
  status: string;
  paidAt: Date | null;
  transactionReference: string | null;
  note: string | null;
};

export type TimelineRow = {
  id: string;
  year: number;
  month: number;
  roundName: string;
  status: string;
  collectionTarget: number;
  expectedTotal: number;
  collectedTotal: number;
  outstandingTotal: number;
  paidCount: number;
  partiallyPaidCount: number;
  pendingCount: number;
  recipients: TimelineRecipient[];
  plannedTotal: number;
  actualTotal: number;
};

/**
 * Every round with its collection position and its scheduled recipients.
 *
 * A round's expected amount is the sum of its applicable obligations, never
 * the configured target, so a round that was edited shows the truth.
 */
export async function getTimelineRows(): Promise<TimelineRow[]> {
  const rounds = await prisma.monthlyRound.findMany({
    include: {
      obligations: { include: { member: { select: { isActive: true } } } },
      payouts: { include: { recipient: { select: { fullName: true } } } },
    },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  const payments = await prisma.payment.findMany({
    include: { reversedBy: { select: { id: true } } },
  });

  const validPayments = payments.filter(
    (payment) =>
      payment.reversalOfPaymentId === null && payment.reversedBy.length === 0,
  );

  return rounds.map((round) => {
    const roundPayments = validPayments.filter(
      (payment) => payment.roundId === round.id,
    );

    const obligations = round.obligations.filter(
      (obligation) => obligation.isApplicable,
    );

    const expectedTotal = obligations.reduce(
      (sum, obligation) => sum + toNumber(obligation.expectedAmount),
      0,
    );

    let collectedTotal = 0;
    let outstandingTotal = 0;
    let paidCount = 0;
    let partiallyPaidCount = 0;
    let pendingCount = 0;

    for (const obligation of obligations) {
      const paid = roundPayments
        .filter((payment) => payment.memberId === obligation.memberId)
        .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

      collectedTotal += paid;

      const status = computePaymentStatus({
        expectedAmount: toNumber(obligation.expectedAmount),
        isApplicable: true,
        paidAmount: paid,
      });

      outstandingTotal += computeOutstanding({
        expectedAmount: toNumber(obligation.expectedAmount),
        isApplicable: true,
        paidAmount: paid,
      });

      if (status === "paid") paidCount += 1;
      else if (status === "partially_paid") partiallyPaidCount += 1;
      else if (status === "not_paid") pendingCount += 1;
    }

    const recipients: TimelineRecipient[] = round.payouts.map((payout) => ({
      id: payout.id,
      memberId: payout.recipientMemberId,
      fullName: payout.recipient.fullName,
      plannedAmount: toNumber(payout.plannedAmount),
      actualAmount:
        payout.actualAmount === null ? null : toNumber(payout.actualAmount),
      status: payout.status,
      paidAt: payout.paidAt,
      transactionReference: payout.transactionReference,
      note: payout.note,
    }));

    return {
      id: round.id,
      year: round.year,
      month: round.month,
      roundName: round.roundName,
      status: round.status,
      collectionTarget: toNumber(round.collectionTarget),
      expectedTotal,
      collectedTotal,
      outstandingTotal,
      paidCount,
      partiallyPaidCount,
      pendingCount,
      recipients,
      plannedTotal: recipients.reduce(
        (sum, recipient) => sum + recipient.plannedAmount,
        0,
      ),
      actualTotal: recipients.reduce(
        (sum, recipient) => sum + (recipient.actualAmount ?? 0),
        0,
      ),
    };
  });
}
