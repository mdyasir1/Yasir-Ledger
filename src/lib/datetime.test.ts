import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  parseLocalDateTime,
  toLocalInputValue,
} from "./datetime";

describe("parseLocalDateTime", () => {
  it("interprets the entered time as Asia/Kolkata", () => {
    // 21 Oct 2026, 2:30 pm IST is 09:00 UTC.
    const parsed = parseLocalDateTime("2026-10-21T14:30");

    expect(parsed.toISOString()).toBe("2026-10-21T09:00:00.000Z");
  });

  it("handles midnight", () => {
    // 1 Nov 2026, 00:00 IST is 18:30 UTC on 31 Oct.
    const parsed = parseLocalDateTime("2026-11-01T00:00");

    expect(parsed.toISOString()).toBe("2026-10-31T18:30:00.000Z");
  });

  it("handles a date with no time", () => {
    const parsed = parseLocalDateTime("2026-10-21");

    expect(parsed.toISOString()).toBe("2026-10-20T18:30:00.000Z");
  });

  it("rejects an unparseable date", () => {
    expect(() => parseLocalDateTime("not-a-date")).toThrow();
  });
});

describe("toLocalInputValue", () => {
  it("renders an instant as wall-clock time in Asia/Kolkata", () => {
    const value = toLocalInputValue(new Date("2026-10-21T09:00:00.000Z"));

    expect(value).toBe("2026-10-21T14:30");
  });

  it("round-trips with parseLocalDateTime", () => {
    const original = "2026-07-15T08:45";
    const parsed = parseLocalDateTime(original);

    expect(toLocalInputValue(parsed)).toBe(original);
  });
});

describe("formatting", () => {
  it("formats a date in Asia/Kolkata", () => {
    expect(formatDate(new Date("2026-10-21T18:30:00.000Z"))).toBe("22 Oct 2026");
  });

  it("formats a date and time in Asia/Kolkata", () => {
    expect(formatDateTime(new Date("2026-10-21T09:00:00.000Z"))).toContain(
      "2026",
    );
  });
});
