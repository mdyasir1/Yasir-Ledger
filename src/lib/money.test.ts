import { describe, expect, it } from "vitest";
import {
  formatPaise,
  formatPaisePlain,
  paiseToRupees,
  rupeesToPaise,
  toAmount,
} from "./money";

describe("money", () => {
  it("converts rupees to exact paise", () => {
    expect(rupeesToPaise(10000)).toBe(1000000);
    expect(rupeesToPaise(12500)).toBe(1250000);
    expect(rupeesToPaise(0)).toBe(0);
    expect(rupeesToPaise(2500.5)).toBe(250050);
  });

  it("converts paise back to rupees", () => {
    expect(paiseToRupees(10000000)).toBe(100000);
    expect(paiseToRupees(1250000n)).toBe(12500);
  });

  it("normalises BigInt and number amounts", () => {
    expect(toAmount(1000000n)).toBe(1000000);
    expect(toAmount(1000000)).toBe(1000000);
  });

  it("formats using the en-IN locale", () => {
    expect(formatPaise(10000000)).toBe("₹1,00,000");
    expect(formatPaise(1250000)).toBe("₹12,500");
    expect(formatPaisePlain(10000000)).toBe("1,00,000");
  });

  it("formats fractional rupees", () => {
    expect(formatPaise(250050)).toBe("₹2,500.50");
  });
});
