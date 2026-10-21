import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Session token format: `base64url(payload).base64url(HMAC-SHA256(payload))`.
 *
 * The token is stateless, so nothing is stored server side. Rotating SESSION_SECRET
 * invalidates every issued session at once.
 */
export type SessionPayload = {
  email: string;
  issuedAt: number;
  expiresAt: number;
};

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

/** Compare two strings without leaking their contents or length through timing. */
export function safeEqual(a: string, b: string): boolean {
  const hashA = createHmac("sha256", "compare").update(a).digest();
  const hashB = createHmac("sha256", "compare").update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

/** Create a signed, self-describing session token. */
export function createSessionToken(
  payload: SessionPayload,
  secret: string,
): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

/**
 * Verify a session token. Returns null when the token is malformed, the
 * signature does not match, or the token has expired.
 */
export function verifySessionToken(
  token: string | undefined | null,
  secret: string,
): SessionPayload | null {
  if (!token) return null;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const body = token.slice(0, separator);
  const signature = token.slice(separator + 1);

  const expected = sign(body, secret);
  const providedBytes = Buffer.from(signature, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  if (
    providedBytes.length !== expectedBytes.length ||
    !timingSafeEqual(providedBytes, expectedBytes)
  ) {
    return null;
  }

  try {
    const decoded = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;

    if (
      typeof decoded.email !== "string" ||
      typeof decoded.expiresAt !== "number" ||
      typeof decoded.issuedAt !== "number"
    ) {
      return null;
    }
    if (decoded.expiresAt <= Date.now()) return null;

    return {
      email: decoded.email,
      issuedAt: decoded.issuedAt,
      expiresAt: decoded.expiresAt,
    };
  } catch {
    return null;
  }
}
