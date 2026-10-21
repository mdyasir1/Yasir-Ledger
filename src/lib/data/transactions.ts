import { prisma } from "@/lib/db";
import { toNumber } from "./rounds";

export type TransactionFilters = {
  roundId?: string;
  memberId?: string;
  paymentMethod?: "upi" | "bank_transfer" | "cash" | "other";
  from?: string;
  to?: string;
  /** `all` keeps every entry, `valid` keeps only entries that count. */
  status?: "all" | "valid";
};

export type TransactionRow = {
  id: string;
  receivedAt: Date;
  memberId: string;
  memberName: string;
  roundId: string;
  roundName: string;
  amount: number;
  paymentMethod: "upi" | "bank_transfer" | "cash" | "other";
  transactionReference: string | null;
  note: string | null;
  reversalOfPaymentId: string | null;
  isReversed: boolean;
  isReversal: boolean;
  isValid: boolean;
};

export type TransactionFilterOptions = {
  rounds: Array<{ id: string; roundName: string }>;
  members: Array<{ id: string; fullName: string }>;
};

/**
 * The complete ledger, filtered.
 *
 * Reversed payments and reversal entries are always returned so that the
 * history is complete; the `status` filter can narrow the list to the entries
 * that count towards the collection.
 */
export async function getTransactions(
  filters: TransactionFilters,
): Promise<TransactionRow[]> {
  const payments = await prisma.payment.findMany({
    where: {
      ...(filters.roundId ? { roundId: filters.roundId } : {}),
      ...(filters.memberId ? { memberId: filters.memberId } : {}),
      ...(filters.paymentMethod ? { paymentMethod: filters.paymentMethod } : {}),
      ...(filters.from || filters.to
        ? {
            receivedAt: {
              ...(filters.from ? { gte: new Date(filters.from) } : {}),
              ...(filters.to ? { lte: new Date(filters.to) } : {}),
            },
          }
        : {}),
    },
    include: {
      member: { select: { fullName: true } },
      round: { select: { roundName: true } },
      reversedBy: { select: { id: true } },
    },
    orderBy: [{ receivedAt: "desc" }, { createdAt: "desc" }],
  });

  return payments
    .map((payment) => {
      const isReversed = payment.reversedBy.length > 0;
      const isReversal = payment.reversalOfPaymentId !== null;

      return {
        id: payment.id,
        receivedAt: payment.receivedAt,
        memberId: payment.memberId,
        memberName: payment.member.fullName,
        roundId: payment.roundId,
        roundName: payment.round.roundName,
        amount: toNumber(payment.amount),
        paymentMethod: payment.paymentMethod,
        transactionReference: payment.transactionReference,
        note: payment.note,
        reversalOfPaymentId: payment.reversalOfPaymentId,
        isReversed,
        isReversal,
        isValid: !isReversed && !isReversal,
      };
    })
    .filter((payment) =>
      filters.status === "valid" ? payment.isValid : true,
    );
}

export async function getTransactionFilterOptions(): Promise<TransactionFilterOptions> {
  const [rounds, members] = await Promise.all([
    prisma.monthlyRound.findMany({
      select: { id: true, roundName: true },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    }),
    prisma.member.findMany({
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return { rounds, members };
}
