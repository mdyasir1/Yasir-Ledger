export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type RoundLike = {
  id: string;
  year: number;
  month: number;
  roundName: string;
  status: string;
};

/** "October 2026" */
export function roundLabel(year: number, month: number): string {
  return `${MONTH_NAMES[month - 1] ?? month} ${year}`;
}

/** A stable, sortable key for a round, for example "2026-10". */
export function roundKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * The round that contains `now`, falling back to the first round.
 *
 * When the current date is outside the scheme the first round is returned, so
 * the application always shows a valid round.
 */
export function findCurrentRound<T extends RoundLike>(
  rounds: T[],
  now: Date = new Date(),
): T | undefined {
  if (rounds.length === 0) return undefined;

  const sorted = [...rounds].sort(
    (a, b) => a.year - b.year || a.month - b.month,
  );

  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const match = sorted.find(
    (round) => round.year === year && round.month === month,
  );

  return match ?? sorted[0];
}

/** Sorts rounds chronologically. */
export function sortRounds<T extends RoundLike>(rounds: T[]): T[] {
  return [...rounds].sort((a, b) => a.year - b.year || a.month - b.month);
}
