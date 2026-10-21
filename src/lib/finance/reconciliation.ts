import type { MemberPosition, RoundSummary } from "./types";

export type ReconciliationSeverity = "info" | "warning" | "critical";

export type ReconciliationWarning = {
  code: string;
  severity: ReconciliationSeverity;
  message: string;
};

/**
 * Reconciliation checks for one round.
 *
 * These are warnings, not errors. A short collection is normal while a round
 * is still open, so it is reported as information rather than a critical
 * problem. A disbursement larger than what was collected is always a critical
 * warning, because it means money left the scheme that was never collected.
 */
export function reconcileRound(input: {
  summary: RoundSummary;
  positions: MemberPosition[];
  plannedPayoutTotal: number;
  actualPayoutTotal: number;
  isRoundOpen: boolean;
}): ReconciliationWarning[] {
  const warnings: ReconciliationWarning[] = [];
  const { summary } = input;

  if (summary.expectedTotal > 0 && summary.collectedTotal > summary.expectedTotal) {
    warnings.push({
      code: "collection_over_expected",
      severity: "warning",
      message: `Collection exceeds the expected amount by ${formatPaise(
        summary.collectedTotal - summary.expectedTotal,
      )}.`,
    });
  }

  if (summary.expectedTotal > 0 && summary.collectedTotal < summary.expectedTotal) {
    const short = summary.expectedTotal - summary.collectedTotal;
    warnings.push({
      code: "collection_short",
      severity: input.isRoundOpen ? "info" : "critical",
      message: input.isRoundOpen
        ? `Still to collect: ${formatPaise(short)} of ${formatPaise(
            summary.expectedTotal,
          )}.`
        : `This round closed ${formatPaise(short)} short of the expected amount.`,
    });
  }

  if (input.actualPayoutTotal > summary.collectedTotal) {
    warnings.push({
      code: "payout_exceeds_collection",
      severity: "critical",
      message: `Payouts of ${formatPaise(
        input.actualPayoutTotal,
      )} exceed the ${formatPaise(summary.collectedTotal)} collected in this round.`,
    });
  }

  if (input.plannedPayoutTotal > summary.collectedTotal) {
    warnings.push({
      code: "planned_payout_exceeds_collection",
      severity: "warning",
      message: `Planned payouts of ${formatPaise(
        input.plannedPayoutTotal,
      )} exceed the ${formatPaise(summary.collectedTotal)} collected in this round.`,
    });
  }

  if (input.actualPayoutTotal > input.plannedPayoutTotal) {
    warnings.push({
      code: "actual_exceeds_planned",
      severity: "warning",
      message: `Actual payouts of ${formatPaise(
        input.actualPayoutTotal,
      )} exceed the planned ${formatPaise(input.plannedPayoutTotal)}.`,
    });
  }

  const overpaid = input.positions.filter(
    (position) => position.status === "overpaid",
  );
  if (overpaid.length > 0) {
    warnings.push({
      code: "member_overpaid",
      severity: "info",
      message: `${overpaid.length} member${overpaid.length === 1 ? "" : "s"} paid more than the expected contribution in this round.`,
    });
  }

  return warnings;
}

/** The next round that has scheduled recipients, for the dashboard. */
export function nextScheduledRecipients(
  rounds: Array<{
    id: string;
    year: number;
    month: number;
    roundName: string;
    status: string;
    recipients: Array<{ id: string; fullName: string; plannedAmount: number }>;
  }>,
): { round: (typeof rounds)[number]; recipients: (typeof rounds)[number]["recipients"] } | null {
  for (const round of rounds) {
    if (round.recipients.length > 0) {
      return { round, recipients: round.recipients };
    }
  }
  return null;
}

function formatPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}
