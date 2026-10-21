/**
 * Application configuration.
 *
 * The product name, the scheme description and the owner credit live here so that
 * they can be changed in a single place. Nothing else in the application hardcodes
 * branding, currency, locale or timezone.
 */
export const appConfig = {
  /** Product name shown in the UI, the document title and the splash screen. */
  name: "Yasir Ledger",
  /** Short description of what the product does. */
  description: "Cheeti contribution scheme manager",
  /** The kind of scheme being tracked. */
  schemeName: "Cheeti",
  /** Owner's display name. */
  ownerName: "Yasir",
  /** Undersigned owner credit. */
  ownerCredit: "Managed by Yasir",
  /** Login page credit. */
  loginCredit: "Organized and managed by Yasir",
  currency: "INR",
  locale: "en-IN",
  timeZone: "Asia/Kolkata",
  /** Name of the signed session cookie. */
  sessionCookieName: "yasir_ledger_session",
  /** Session lifetime in seconds (7 days). */
  sessionMaxAgeSeconds: 60 * 60 * 24 * 7,
} as const;

export type AppConfig = typeof appConfig;
