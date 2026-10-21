/**
 * Money helpers.
 *
 * Every amount in the database is an integer number of PAISE stored in a BIGINT
 * column. Rs 1,00,000 is therefore 10000000. Money is never represented as a
 * floating point value and never rounded except once, at the input boundary.
 */

import { appConfig } from "@/config/app";

export type Paise = bigint | number;

/** Convert rupees (possibly fractional) to an exact integer number of paise. */
export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) {
    throw new Error("rupeesToPaise received a non-finite value");
  }
  return Math.round(rupees * 100);
}

/** Convert paise to a rupee number. Exact for every amount this application handles. */
export function paiseToRupees(paise: Paise): number {
  return Number(paise) / 100;
}

/** Normalise a Prisma BigInt (or number) into a plain number for transport. */
export function toAmount(paise: Paise): number {
  return typeof paise === "bigint" ? Number(paise) : paise;
}

const currencyFormatter = new Intl.NumberFormat(appConfig.locale, {
  style: "currency",
  currency: appConfig.currency,
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** Used when the amount has paise, so trailing zeroes are always shown. */
const currencyFormatterExact = new Intl.NumberFormat(appConfig.locale, {
  style: "currency",
  currency: appConfig.currency,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const plainFormatter = new Intl.NumberFormat(appConfig.locale, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Format paise as a rupee amount, e.g. 10000000 -> "₹1,00,000".
 * Amounts that include paise always show two decimal places.
 */
export function formatPaise(paise: Paise): string {
  const amount = typeof paise === "bigint" ? paise : BigInt(Math.trunc(paise));
  return amount % 100n === 0n
    ? currencyFormatter.format(paiseToRupees(amount))
    : currencyFormatterExact.format(paiseToRupees(amount));
}

/** Format paise without the currency symbol, e.g. 10000000 -> "1,00,000". */
export function formatPaisePlain(paise: Paise): string {
  return plainFormatter.format(paiseToRupees(paise));
}

/** Format a rupee amount that has not yet been converted to paise. */
export function formatRupees(rupees: number): string {
  return currencyFormatter.format(rupees);
}

/** Format a rupee amount without the currency symbol. */
export function formatRupeesPlain(rupees: number): string {
  return plainFormatter.format(rupees);
}

/**
 * Format a rupee amount the way a receipt should read it, always with two
 * decimal places, e.g. "₹2,500.00".
 */
export function formatPaiseExact(paise: Paise): string {
  return new Intl.NumberFormat(appConfig.locale, {
    style: "currency",
    currency: appConfig.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(paiseToRupees(paise));
}
