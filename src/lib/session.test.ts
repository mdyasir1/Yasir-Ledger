import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  safeEqual,
  verifySessionToken,
  type SessionPayload,
} from "./session";

const SECRET = "a".repeat(64);

function payload(overrides: Partial<SessionPayload> = {}): SessionPayload {
  const now = Date.now();
  return {
    email: "mdyasir4145@gmail.com",
    issuedAt: now,
    expiresAt: now + 60_000,
    ...overrides,
  };
}

describe("session tokens", () => {
  it("round-trips a valid token", () => {
    const token = createSessionToken(payload(), SECRET);
    const verified = verifySessionToken(token, SECRET);

    expect(verified).not.toBeNull();
    expect(verified?.email).toBe("mdyasir4145@gmail.com");
  });

  it("rejects a token signed with a different secret", () => {
    const token = createSessionToken(payload(), SECRET);
    expect(verifySessionToken(token, "b".repeat(64))).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const token = createSessionToken(payload(), SECRET);
    const [body, signature] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify(payload({ email: "attacker@example.com" })),
      "utf8",
    ).toString("base64url");

    expect(verifySessionToken(`${forged}.${signature}`, SECRET)).toBeNull();
    expect(body).not.toBe(forged);
  });

  it("rejects an expired token", () => {
    const token = createSessionToken(
      payload({ issuedAt: Date.now() - 120_000, expiresAt: Date.now() - 60_000 }),
      SECRET,
    );
    expect(verifySessionToken(token, SECRET)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifySessionToken(undefined, SECRET)).toBeNull();
    expect(verifySessionToken("", SECRET)).toBeNull();
    expect(verifySessionToken("not-a-token", SECRET)).toBeNull();
    expect(verifySessionToken("a.b", SECRET)).toBeNull();
  });
});

describe("safeEqual", () => {
  it("matches identical strings", () => {
    expect(safeEqual("secret", "secret")).toBe(true);
  });

  it("rejects different strings of different lengths", () => {
    expect(safeEqual("secret", "secret-but-longer")).toBe(false);
  });
});
