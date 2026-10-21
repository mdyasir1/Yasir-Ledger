"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { startSession, verifyCredentials } from "@/lib/auth";
import { consumeRateLimit, resetRateLimit } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginState = {
  error?: string;
};

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

/**
 * Only same-origin relative paths are accepted as a post-login destination, so
 * the `next` parameter can never be used to redirect the administrator to
 * another site.
 */
function safeNextPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

async function clientKey(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    headerList.get("x-real-ip") ||
    "unknown";
  return `login:${ip}`;
}

/**
 * Sign the administrator in.
 *
 * The submitted details are validated, rate limited and compared against the
 * configured credential. A successful login issues the signed session cookie.
 */
export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter your details" };
  }

  const key = await clientKey();
  const limit = consumeRateLimit(key, MAX_ATTEMPTS, WINDOW_MS);

  if (!limit.allowed) {
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return {
      error: `Too many sign-in attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  if (!verifyCredentials(parsed.data.email, parsed.data.password)) {
    return { error: "Incorrect email or password." };
  }

  resetRateLimit(key);
  await startSession(parsed.data.email);

  // `redirect` throws a control-flow error, so it must not be wrapped in try/catch.
  redirect(safeNextPath(formData.get("next")));
}
