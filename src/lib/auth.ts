import { cookies } from "next/headers";
import { appConfig } from "@/config/app";
import { serverEnv } from "@/lib/server-env";
import {
  createSessionToken,
  safeEqual,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session";

/**
 * Administrator authentication.
 *
 * There is exactly one administrator. The credential is held in server-only
 * environment variables and is checked with a constant-time comparison. A
 * successful login issues a signed, HttpOnly session cookie.
 *
 * If Supabase Auth is introduced later, this module is the only place that has
 * to change.
 */

/** Check a submitted email/password against the configured administrator. */
export function verifyCredentials(email: string, password: string): boolean {
  const expectedEmail = serverEnv.adminEmail.trim().toLowerCase();
  const expectedPassword = serverEnv.adminPassword;

  // Both comparisons always run, so the response time does not reveal which
  // half of the credential was wrong.
  const emailMatches = safeEqual(email.trim().toLowerCase(), expectedEmail);
  const passwordMatches = safeEqual(password, expectedPassword);

  return emailMatches && passwordMatches;
}

/** Read the current session, or null when there is no valid session. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(appConfig.sessionCookieName)?.value;
  return verifySessionToken(token, serverEnv.sessionSecret);
}

/** Issue a session cookie for the administrator. Server Action / Route Handler only. */
export async function startSession(email: string): Promise<void> {
  const store = await cookies();
  const now = Date.now();

  const token = createSessionToken(
    {
      email,
      issuedAt: now,
      expiresAt: now + appConfig.sessionMaxAgeSeconds * 1000,
    },
    serverEnv.sessionSecret,
  );

  store.set(appConfig.sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: serverEnv.isProduction,
    path: "/",
    maxAge: appConfig.sessionMaxAgeSeconds,
  });
}

/** Clear the session cookie. */
export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(appConfig.sessionCookieName);
}
