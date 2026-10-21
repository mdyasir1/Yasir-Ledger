import { prisma } from "@/lib/db";
import { buildMemberPosition, sortForCollection, summariseRound } from "@/lib/finance/summary";
import type { MemberPosition, RoundSummary, StoredPayment } from "@/lib/finance/types";
import { toNumber, type RoundRow } from "./rounds";

export type PaymentRow = {
  id: string;
  memberId: string;
  memberName: string;
  roundId: string;
  amount: number;
  paymentMethod: "upi" | "bank_transfer" | "cash" | "other";
  receivedAt: Date;
  transactionReference: string | null;
  note: string | null;
  reversalOfPaymentId: string | null;
  /** True when a later entry reverses this payment. */
  isReversed: boolean;
  /** True when this entry is itself a reversal. */
  isReversal: boolean;
  /** True when the payment counts towards the collection total. */
  isValid: boolean;
};

export type PayoutRow = {
  id: string;
  recipientMemberId: string;
  recipientName: string;
  plannedAmount: number;
  actualAmount: number | null;
  status: string;
  paidAt: Date | null;
  transactionReference: string | null;
  note: string | null;
};

export type RoundCollection = {
  round: RoundRow;
  positions: MemberPosition[];
  summary: RoundSummary;
  payments: PaymentRow[];
  payouts: PayoutRow[];
  plannedPayoutTotal: number;
  actualPayoutTotal: number;
};

type PaymentWithRelations = {
  id: string;
  memberId: string;
  roundId: string;
  amount: bigint;
  paymentMethod: "upi" | "bank_transfer" | "cash" | "other";
  receivedAt: Date;
  transactionReference: string | null;
  note: string | null;
  reversalOfPaymentId: string | null;
  reversedBy: Array<{ id: string }>;
  member: { fullName: string };
};

function toPaymentRow(payment: PaymentWithRelations): PaymentRow {
  const isReversed = payment.reversedBy.length > 0;
  const isReversal = payment.reversalOfPaymentId !== null;

  return {
    id: payment.id,
    memberId: payment.memberId,
    memberName: payment.member.fullName,
    roundId: payment.roundId,
    amount: toNumber(payment.amount),
    paymentMethod: payment.paymentMethod,
    receivedAt: payment.receivedAt,
    transactionReference: payment.transactionReference,
    note: payment.note,
    reversalOfPaymentId: payment.reversalOfPaymentId,
    isReversed,
    isReversal,
    isValid: !isReversed && !isReversal,
  };
}

/**
 * Loads everything needed to show one round: every member, their obligation,
 * their payments and the round's scheduled payouts.
 *
 * Only payments that have not been reversed and are not themselves reversals
 * count towards the collection totals.
 */
export async function getRoundCollection(
  roundId: string,
): Promise<RoundCollection | null> {
  const round = await prisma.monthlyRound.findUnique({
    where: { id: roundId },
    include: {
      obligations: { include: { member: true } },
      payouts: { include: { recipient: true } },
    },
  });

  if (!round) return null;

  const members = await prisma.member.findMany({
    orderBy: { fullName: "asc" },
  });

  const payments = await prisma.payment.findMany({
    where: { roundId },
    include: {
      member: { select: { fullName: true } },
      reversedBy: { select: { id: true } },
    },
    orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
  });

  const paymentRows = payments.map(toPaymentRow);

  const obligationByMember = new Map(
    round.obligations.map((obligation) => [obligation.memberId, obligation]),
  );

  const positions = members.map((member) => {
    const obligation = obligationByMember.get(member.id);

    const memberPayments: StoredPayment[] = paymentRows
      .filter(
        (payment) => payment.memberId === member.id && payment.isValid,
      )
      .map((payment) => ({
        id: payment.id,
        memberId: payment.memberId,
        amount: payment.amount,
        receivedAt: payment.receivedAt,
        paymentMethod: payment.paymentMethod,
        transactionReference: payment.transactionReference,
        note: payment.note,
        reversalOfPaymentId: payment.reversalOfPaymentId,
        isReversed: payment.isReversed,
      }));

    return buildMemberPosition({
      memberId: member.id,
      fullName: member.fullName,
      slug: member.slug,
      phoneNumber: member.phoneNumber,
      expectedAmount: obligation ? toNumber(obligation.expectedAmount) : null,
      isApplicable: obligation ? obligation.isApplicable : false,
      payments: memberPayments,
    });
  });

  const payoutRows: PayoutRow[] = round.payouts.map((payout) => ({
    id: payout.id,
    recipientMemberId: payout.recipientMemberId,
    recipientName: payout.recipient.fullName,
    plannedAmount: toNumber(payout.plannedAmount),
    actualAmount:
      payout.actualAmount === null ? null : toNumber(payout.actualAmount),
    status: payout.status,
    paidAt: payout.paidAt,
    transactionReference: payout.transactionReference,
    note: payout.note,
  }));

  const summary = summariseRound(positions);

  return {
    round: {
      id: round.id,
      year: round.year,
      month: round.month,
      roundName: round.roundName,
      collectionTarget: toNumber(round.collectionTarget),
      status: round.status,
      notes: round.notes,
      plannedPayoutTotal: payoutRows.reduce(
        (sum, payout) => sum + payout.plannedAmount,
        0,
      ),
      actualPayoutTotal: payoutRows.reduce(
        (sum, payout) => sum + (payout.actualAmount ?? 0),
        0,
      ),
      recipientCount: payoutRows.length,
    },
    positions: sortForCollection(positions),
    summary,
    payments: paymentRows,
    payouts: payoutRows,
    plannedPayoutTotal: payoutRows.reduce(
      (sum, payout) => sum + payout.plannedAmount,
      0,
    ),
    actualPayoutTotal: payoutRows.reduce(
      (sum, payout) => sum + (payout.actualAmount ?? 0),
      0,
    ),
  };
}
