import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("writes a header and one line per transaction", () => {
    const csv = toCsv([
      {
        receivedAt: new Date("2026-10-05T10:30:00Z"),
        fullName: "Fatima",
        roundName: "October 2026",
        amount: 500_000,
        paymentMethod: "upi",
        transactionReference: "UPI123",
        note: null,
        status: "valid",
      },
    ]);

    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Date");
    expect(lines[1]).toContain("Fatima");
    expect(lines[1]).toContain("₹5,000");
    expect(lines[1]).toContain("valid");
  });

  it("quotes fields that contain a comma, quote or newline", () => {
    const csv = toCsv([
      {
        receivedAt: new Date("2026-10-05T10:30:00Z"),
        fullName: "Zeenata, Badeami",
        roundName: "October 2026",
        amount: 1_250_000,
        paymentMethod: "cash",
        transactionReference: 'ref "quoted"',
        note: "line one\nline two",
        status: "valid",
      },
    ]);

    const line = csv.split("\r\n")[1];
    expect(line).toContain('"Zeenata, Badeami"');
    expect(line).toContain('"ref ""quoted"""');
    expect(line).toContain('"line one\nline two"');
  });

  it("writes an empty string for missing values", () => {
    const csv = toCsv([
      {
        receivedAt: new Date("2026-10-05T10:30:00Z"),
        fullName: "Khaise",
        roundName: "October 2026",
        amount: 250_000,
        paymentMethod: "other",
        transactionReference: null,
        note: null,
        status: "valid",
      },
    ]);

    const fields = csv.split("\r\n")[1].split(",");
    expect(fields).toContain("");
  });
});
