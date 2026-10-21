import { prisma } from "@/lib/db";
import { toNumber } from "./rounds";

export type RecentPayment = {
  id: string;
  memberName: string;
  roundName: string;
  amount: number;
  paymentMethod: "upi" | "bank_transfer" | "cash" | "other";
  receivedAt: Date;
  isReversal: boolean;
  isReversed: boolean;
};

/**
 * The most recent transactions across every round, newest first.
 *
 * Reversals and reversed entries are included so that the activity list never
 * hides a correction.
 */
export async function getRecentPayments(limit = 8): Promise<RecentPayment[]> {
  const payments = await prisma.payment.findMany({
    include: {
      member: { select: { fullName: true } },
      round: { select: { roundName: true } },
      reversedBy: { select: { id: true } },
    },
    orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return payments.map((payment) => ({
    id: payment.id,
    memberName: payment.member.fullName,
    roundName: payment.round.roundName,
    amount: toNumber(payment.amount),
    paymentMethod: payment.paymentMethod,
    receivedAt: payment.receivedAt,
    isReversal: payment.reversalOfPaymentId !== null,
    isReversed: payment.reversedBy.length > 0,
  }));
}

/**
 * The next round that has a scheduled recipient, and that recipient's names.
 */
export async function getNextScheduledRound(): Promise<{
  roundId: string;
  roundName: string;
  year: number;
  month: number;
  recipients: Array<{ id: string; fullName: string; plannedAmount: number }>;
  plannedTotal: number;
  actualTotal: number;
} | null> {
  const round = await prisma.monthlyRound.findFirst({
    where: { payouts: { some: {} } },
    include: {
      payouts: { include: { recipient: { select: { fullName: true } } } },
    },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  if (!round) return null;

  return {
    roundId: round.id,
    roundName: round.roundName,
    year: round.year,
    month: round.month,
    recipients: round.payouts.map((payout) => ({
      id: payout.recipientMemberId,
      fullName: payout.recipient.fullName,
      plannedAmount: toNumber(payout.plannedAmount),
    })),
    plannedTotal: round.payouts.reduce(
      (sum, payout) => sum + toNumber(payout.plannedAmount),
      0,
    ),
    actualTotal: round.payouts.reduce(
      (sum, payout) => sum + toNumber(payout.actualAmount),
      0,
    ),
  };
}
