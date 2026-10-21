/**
 * Server-only environment access.
 *
 * Every value is read lazily so that importing this module never throws at build
 * time, and every value is validated when it is actually used. This module must
 * never be imported by a Client Component.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example for the expected values.`,
    );
  }
  return value;
}

export const serverEnv = {
  /** Runtime connection: Supabase transaction-mode pooler. */
  get databaseUrl(): string {
    return required("DATABASE_URL");
  },
  /** Direct connection: Supabase session-mode pooler. Used by scripts and the CLI. */
  get directUrl(): string {
    return required("DIRECT_URL");
  },
  /** The single administrator's login identity. */
  get adminEmail(): string {
    return required("ADMIN_EMAIL");
  },
  /** The single administrator's login secret. */
  get adminPassword(): string {
    return required("ADMIN_PASSWORD");
  },
  /** HMAC key used to sign session cookies. */
  get sessionSecret(): string {
    const secret = required("SESSION_SECRET");
    if (secret.length < 32) {
      throw new Error(
        "SESSION_SECRET must be at least 32 characters. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
      );
    }
    return secret;
  },
  get isProduction(): boolean {
    return process.env.NODE_ENV === "production";
  },
} as const;
