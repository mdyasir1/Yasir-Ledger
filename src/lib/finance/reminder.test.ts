import { describe, expect, it } from "vitest";
import {
  buildCallUrl,
  buildReminderMessage,
  buildReminderMessagePlain,
  buildWhatsAppUrl,
} from "./reminder";
import type { MemberPosition } from "./types";

function position(overrides: Partial<MemberPosition> = {}): MemberPosition {
  return {
    memberId: "m1",
    fullName: "Khaise",
    slug: "khaise",
    phoneNumber: null,
    expectedAmount: 250_000,
    isApplicable: true,
    paidAmount: 0,
    outstanding: 250_000,
    status: "not_paid",
    paymentCount: 0,
    latestPaymentAt: null,
    ...overrides,
  };
}

describe("buildReminderMessage", () => {
  it("matches the plan's worked example for an unpaid member", () => {
    expect(
      buildReminderMessage({
        fullName: "Khaise",
        roundName: "October 2026",
        position: position(),
      }),
    ).toBe(
      "Hi Khaise, for October 2026, your contribution is ₹2,500. We have not recorded this payment yet. Please let me know when you have paid.",
    );
  });

  it("uses the first name only", () => {
    const message = buildReminderMessage({
      fullName: "Zeenata Badeami",
      roundName: "February 2027",
      position: position({ fullName: "Zeenata Badeami" }),
    });

    expect(message.startsWith("Hi Zeenata,")).toBe(true);
  });

  it("states the outstanding balance for a partially paid member", () => {
    const message = buildReminderMessage({
      fullName: "Fatima",
      roundName: "October 2026",
      position: position({
        fullName: "Fatima",
        expectedAmount: 500_000,
        paidAmount: 250_000,
        outstanding: 250_000,
        status: "partially_paid",
        paymentCount: 1,
      }),
    });

    expect(message).toContain("₹5,000");
    expect(message).toContain("₹2,500");
    expect(message).toContain("₹2,500 is still outstanding");
  });

  it("thanks a member who has paid in full", () => {
    const message = buildReminderMessage({
      fullName: "Yasir",
      roundName: "October 2026",
      position: position({
        fullName: "Yasir",
        expectedAmount: 1_000_000,
        paidAmount: 1_000_000,
        outstanding: 0,
        status: "paid",
        paymentCount: 1,
      }),
    });

    expect(message).toContain("thank you");
    expect(message).toContain("₹10,000");
  });

  it("does not accuse a member who has paid of not paying", () => {
    const message = buildReminderMessage({
      fullName: "Yasir",
      roundName: "October 2026",
      position: position({
        fullName: "Yasir",
        status: "paid",
        paidAmount: 1_000_000,
        outstanding: 0,
      }),
    });

    expect(message).not.toContain("not recorded");
  });

  it("explains an overpayment", () => {
    const message = buildReminderMessage({
      fullName: "Farhat",
      roundName: "October 2026",
      position: position({
        fullName: "Farhat",
        expectedAmount: 500_000,
        paidAmount: 600_000,
        outstanding: 0,
        status: "overpaid",
        paymentCount: 1,
      }),
    });

    expect(message).toContain("₹1,000 more");
  });

  it("handles a member with no obligation", () => {
    const message = buildReminderMessage({
      fullName: "Sajidh",
      roundName: "October 2026",
      position: position({
        fullName: "Sajidh",
        expectedAmount: 0,
        outstanding: 0,
        status: "not_applicable",
        isApplicable: false,
      }),
    });

    expect(message).toContain("no contribution is due");
  });

  it("produces a plain-text variant with no typographic dashes", () => {
    const plain = buildReminderMessagePlain({
      fullName: "Yasir",
      roundName: "October 2026",
      position: position({ status: "paid", paidAmount: 1_000_000, outstanding: 0 }),
    });

    expect(plain).toBe(
      buildReminderMessage({
        fullName: "Yasir",
        roundName: "October 2026",
        position: position({
          status: "paid",
          paidAmount: 1_000_000,
          outstanding: 0,
        }),
      }),
    );
    expect(plain).not.toMatch(/[—–]/);
  });
});

describe("contact links", () => {
  it("builds a WhatsApp link with the message pre-filled", () => {
    const url = buildWhatsAppUrl("+91 98765 43210", "Hello there");

    expect(url).toBe(
      `https://wa.me/919876543210?text=${encodeURIComponent("Hello there")}`,
    );
  });

  it("does not double the India country code", () => {
    expect(buildWhatsAppUrl("919876543210", "Hi")).toContain("wa.me/919876543210");
  });

  it("returns null for an unusable phone number", () => {
    expect(buildWhatsAppUrl("123", "Hi")).toBeNull();
    expect(buildCallUrl("123")).toBeNull();
  });

  it("builds a tel link", () => {
    expect(buildCallUrl("+91 98765 43210")).toBe("tel:+919876543210");
  });
});
