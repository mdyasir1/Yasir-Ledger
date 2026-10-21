import { formatPaise } from "@/lib/money";
import type { MemberPosition } from "./types";

/**
 * Builds the reminder message for a member.
 *
 * The message is always generated from the values actually recorded in the
 * database. A member whose payments show they have paid is never told that
 * they have not paid.
 */
export function buildReminderMessage(input: {
  fullName: string;
  roundName: string;
  position: MemberPosition;
}): string {
  const { fullName, roundName, position } = input;
  const firstName = fullName.split(" ")[0];

  if (position.status === "not_applicable") {
    return `Hi ${firstName}, no contribution is due from you for ${roundName}. Thank you.`;
  }

  if (position.status === "paid") {
    return `Hi ${firstName}, thank you. We have recorded your full contribution of ${formatPaise(
      position.expectedAmount,
    )} for ${roundName}.`;
  }

  if (position.status === "overpaid") {
    return `Hi ${firstName}, we have recorded ${formatPaise(
      position.paidAmount,
    )} for ${roundName}, which is ${formatPaise(
      position.paidAmount - position.expectedAmount,
    )} more than the expected contribution of ${formatPaise(
      position.expectedAmount,
    )}. Please let me know how you would like this handled.`;
  }

  if (position.status === "partially_paid") {
    return `Hi ${firstName}, for ${roundName}, your contribution is ${formatPaise(
      position.expectedAmount,
    )} and we have recorded ${formatPaise(
      position.paidAmount,
    )}. ${formatPaise(position.outstanding)} is still outstanding. Please let me know when you have paid the balance.`;
  }

  return `Hi ${firstName}, for ${roundName}, your contribution is ${formatPaise(
    position.expectedAmount,
  )}. We have not recorded this payment yet. Please let me know when you have paid.`;
}

/** A WhatsApp-friendly version: no formatting, no currency spacing issues. */
export function buildReminderMessagePlain(input: {
  fullName: string;
  roundName: string;
  position: MemberPosition;
}): string {
  return buildReminderMessage(input);
}

/** A `wa.me` link with the message pre-filled. */
export function buildWhatsAppUrl(
  phoneNumber: string,
  message: string,
): string | null {
  const digits = phoneNumber.replace(/[^\d]/g, "");
  if (digits.length < 10) return null;
  const international = digits.startsWith("91") ? digits : `91${digits}`;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

/** A `tel:` link. */
export function buildCallUrl(phoneNumber: string): string | null {
  const digits = phoneNumber.replace(/[^\d+]/g, "");
  if (digits.length < 10) return null;
  return `tel:${digits}`;
}
