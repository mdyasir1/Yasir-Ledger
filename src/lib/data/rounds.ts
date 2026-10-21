import { prisma } from "@/lib/db";

/** Prisma returns `bigint` for money columns; the UI works with numbers. */
export function toNumber(value: bigint | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "bigint" ? Number(value) : value;
}

/** Same, but preserves `null` for columns that are genuinely optional. */
export function toNullableNumber(
  value: bigint | number | null | undefined,
): number | null {
  if (value === null || value === undefined) return null;
  return typeof value === "bigint" ? Number(value) : value;
}

export type RoundRow = {
  id: string;
  year: number;
  month: number;
  roundName: string;
  collectionTarget: number;
  status: string;
  notes: string | null;
  plannedPayoutTotal: number;
  actualPayoutTotal: number;
  recipientCount: number;
};

type RoundWithPayouts = {
  id: string;
  year: number;
  month: number;
  roundName: string;
  collectionTarget: bigint;
  status: string;
  notes: string | null;
  payouts: Array<{ plannedAmount: bigint; actualAmount: bigint | null }>;
};

function toRoundRow(round: RoundWithPayouts): RoundRow {
  return {
    id: round.id,
    year: round.year,
    month: round.month,
    roundName: round.roundName,
    collectionTarget: toNumber(round.collectionTarget),
    status: round.status,
    notes: round.notes,
    plannedPayoutTotal: round.payouts.reduce(
      (sum, payout) => sum + toNumber(payout.plannedAmount),
      0,
    ),
    actualPayoutTotal: round.payouts.reduce(
      (sum, payout) => sum + toNumber(payout.actualAmount),
      0,
    ),
    recipientCount: round.payouts.length,
  };
}

const roundInclude = {
  payouts: {
    select: { plannedAmount: true, actualAmount: true },
  },
} as const;

/** Every round, in chronological order. */
export async function getRounds(): Promise<RoundRow[]> {
  const rounds = await prisma.monthlyRound.findMany({
    include: roundInclude,
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  return rounds.map(toRoundRow);
}

/** A single round by id. */
export async function getRoundById(id: string): Promise<RoundRow | null> {
  const round = await prisma.monthlyRound.findUnique({
    where: { id },
    include: roundInclude,
  });

  return round ? toRoundRow(round) : null;
}

/** A single round by year and month. */
export async function getRoundByPeriod(
  year: number,
  month: number,
): Promise<RoundRow | null> {
  const round = await prisma.monthlyRound.findUnique({
    where: { year_month: { year, month } },
    include: roundInclude,
  });

  return round ? toRoundRow(round) : null;
}
