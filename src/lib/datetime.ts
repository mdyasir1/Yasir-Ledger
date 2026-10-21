import { appConfig } from "@/config/app";

/**
 * Date and time helpers.
 *
 * The scheme runs in Asia/Kolkata. The server may run in any timezone (Vercel
 * runs in UTC), so a date entered by the administrator must be interpreted as
 * wall-clock time in Asia/Kolkata and stored as the correct UTC instant.
 *
 * Without this, a payment recorded as "21 October 2026, 2:30 pm" would be
 * stored five and a half hours off.
 */

export const APP_TIME_ZONE = appConfig.timeZone;

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  hour12: false,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

function zoneOffsetMs(instant: Date): number {
  const parts = partsFormatter.formatToParts(instant);
  const read = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  const asUtc = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour") % 24,
    read("minute"),
    read("second"),
  );

  return asUtc - instant.getTime();
}

/**
 * Interprets a wall-clock date and time in the application timezone and
 * returns the correct UTC instant.
 *
 * Accepts `YYYY-MM-DDTHH:mm` (what a datetime-local input produces) and
 * `YYYY-MM-DD`.
 */
export function parseLocalDateTime(value: string): Date {
  const trimmed = value.trim();
  const [datePart, timePart = "00:00"] = trimmed.split("T");

  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second] = timePart.split(":").map(Number);

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day)
  ) {
    throw new Error(`Invalid date: ${value}`);
  }

  const asUtc = Date.UTC(
    year,
    month - 1,
    day,
    Number.isFinite(hour) ? hour : 0,
    Number.isFinite(minute) ? minute : 0,
    Number.isFinite(second) ? second : 0,
  );

  // Asia/Kolkata has no daylight saving, so a single offset lookup is exact.
  return new Date(asUtc - zoneOffsetMs(new Date(asUtc)));
}

/**
 * Formats an instant as wall-clock time in the application timezone, in the
 * format a `datetime-local` input expects.
 */
export function toLocalInputValue(instant: Date): string {
  const parts = partsFormatter.formatToParts(instant);
  const read = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${read("year")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}`;
}

const dateFormatter = new Intl.DateTimeFormat(appConfig.locale, {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat(appConfig.locale, {
  timeZone: APP_TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

/** "21 Oct 2026" */
export function formatDate(instant: Date | string): string {
  return dateFormatter.format(new Date(instant));
}

/** "21 Oct 2026, 02:30 pm" */
export function formatDateTime(instant: Date | string): string {
  return dateTimeFormatter.format(new Date(instant));
}
