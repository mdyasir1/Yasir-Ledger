import type { PaymentStatus } from "./types";

/**
 * The payment status of one member in one round.
 *
 * The rules come straight from the plan:
 *   - Not Paid: no valid payment received and an amount is due.
 *   - Partially Paid: some money received, expected amount not fulfilled.
 *   - Paid: the expected contribution has been fulfilled exactly.
 *   - Overpaid: valid payments exceed the expected contribution.
 *   - Not Applicable: no contribution is due from the member for that round.
 *
 * A member is never marked as paid because the round's total collection is
 * sufficient, and the total is never divided by a fixed amount to count paid
 * members.
 */
export function computePaymentStatus(input: {
  /** Expected contribution in paise; null when no obligation is configured. */
  expectedAmount: number | null;
  /** False when the obligation is marked as not applicable for this round. */
  isApplicable: boolean;
  /** Sum of the member's valid payments in paise. */
  paidAmount: number;
}): PaymentStatus {
  const { expectedAmount, isApplicable, paidAmount } = input;

  if (!isApplicable || expectedAmount === null) {
    return "not_applicable";
  }

  if (paidAmount > expectedAmount) {
    return "overpaid";
  }

  if (paidAmount === expectedAmount) {
    return "paid";
  }

  if (paidAmount <= 0) {
    return "not_paid";
  }

  return "partially_paid";
}

/**
 * The amount still outstanding for a member.
 *
 * Only positive balances are outstanding: an overpaid member has nothing
 * outstanding, and their surplus is not netted against another member.
 */
export function computeOutstanding(input: {
  expectedAmount: number | null;
  isApplicable: boolean;
  paidAmount: number;
}): number {
  if (!input.isApplicable || input.expectedAmount === null) {
    return 0;
  }
  return Math.max(0, input.expectedAmount - input.paidAmount);
}

/** True when the member still owes money for this round. */
export function isOutstanding(status: PaymentStatus): boolean {
  return status === "not_paid" || status === "partially_paid";
}
