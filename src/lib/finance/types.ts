/**
 * Financial domain types.
 *
 * Every amount in this file is a number of PAISE.
 */

export type PaymentStatus =
  | "not_paid"
  | "partially_paid"
  | "paid"
  | "overpaid"
  | "not_applicable";

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "not_paid",
  "partially_paid",
  "paid",
  "overpaid",
  "not_applicable",
];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  not_paid: "Not paid",
  partially_paid: "Partially paid",
  paid: "Paid",
  overpaid: "Overpaid",
  not_applicable: "Not applicable",
};

/** A member's obligation for one round. */
export type Obligation = {
  memberId: string;
  /** Expected contribution in paise, or null when no obligation exists. */
  expectedAmount: number | null;
  isApplicable: boolean;
};

/** A payment that counts towards a collection total. */
export type ValidPayment = {
  id: string;
  memberId: string;
  amount: number;
  receivedAt: Date;
  paymentMethod: "upi" | "bank_transfer" | "cash" | "other";
  transactionReference: string | null;
  note: string | null;
};

/** A payment as stored, including entries that must be excluded from totals. */
export type StoredPayment = ValidPayment & {
  /** Set when this row reverses an earlier payment. */
  reversalOfPaymentId: string | null;
  /** Set when this row has been reversed by a later entry. */
  isReversed: boolean;
};

/** One member's position in a round. */
export type MemberPosition = {
  memberId: string;
  fullName: string;
  slug: string;
  phoneNumber: string | null;
  expectedAmount: number;
  isApplicable: boolean;
  paidAmount: number;
  outstanding: number;
  status: PaymentStatus;
  paymentCount: number;
  latestPaymentAt: Date | null;
};

/** Totals for one round. */
export type RoundSummary = {
  expectedTotal: number;
  collectedTotal: number;
  outstandingTotal: number;
  paidCount: number;
  partiallyPaidCount: number;
  pendingCount: number;
  overpaidCount: number;
  notApplicableCount: number;
  memberCount: number;
  /** Collected divided by expected, or 0 when nothing is expected. */
  collectionProgress: number;
};

/** Totals for one member across the whole scheme. */
export type MemberSummary = {
  memberId: string;
  fullName: string;
  slug: string;
  phoneNumber: string | null;
  defaultContributionAmount: number;
  expectedTotal: number;
  collectedTotal: number;
  outstandingTotal: number;
  paymentCount: number;
  latestPaymentAt: Date | null;
};
