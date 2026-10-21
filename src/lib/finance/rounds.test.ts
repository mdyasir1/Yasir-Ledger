import { describe, expect, it } from "vitest";
import { findCurrentRound, roundKey, roundLabel, sortRounds } from "./rounds";

const ROUNDS = [
  { id: "3", year: 2027, month: 3, roundName: "March 2027", status: "open" },
  { id: "1", year: 2026, month: 10, roundName: "October 2026", status: "open" },
  { id: "2", year: 2026, month: 12, roundName: "December 2026", status: "open" },
];

describe("round helpers", () => {
  it("labels a round", () => {
    expect(roundLabel(2026, 10)).toBe("October 2026");
    expect(roundLabel(2027, 1)).toBe("January 2027");
  });

  it("builds a sortable key", () => {
    expect(roundKey(2026, 10)).toBe("2026-10");
    expect(roundKey(2027, 1)).toBe("2027-01");
  });

  it("sorts rounds chronologically", () => {
    expect(sortRounds(ROUNDS).map((round) => round.id)).toEqual(["1", "2", "3"]);
  });

  it("finds the round that contains the current date", () => {
    const found = findCurrentRound(ROUNDS, new Date("2026-12-15T00:00:00Z"));
    expect(found?.id).toBe("2");
  });

  it("falls back to the first round when the date is outside the scheme", () => {
    const found = findCurrentRound(ROUNDS, new Date("2030-01-15T00:00:00Z"));
    expect(found?.id).toBe("1");
  });

  it("returns undefined when there are no rounds", () => {
    expect(findCurrentRound([], new Date())).toBeUndefined();
  });
});
