/**
 * Environment variable reporting.
 *
 * `src/lib/server-env.ts` throws when a required variable is missing, which is
 * the right behaviour for application code. This module is the opposite: it
 * reports what is missing without throwing, so a diagnostic endpoint can
 * describe the problem instead of becoming it.
 */

export const REQUIRED_ENV_VARS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "ADMIN_EMAIL",
  "ADMIN_PASSWORD",
  "SESSION_SECRET",
] as const;

export type EnvVarName = (typeof REQUIRED_ENV_VARS)[number];
export type EnvVarState = "present" | "missing";

/** The required variables that are absent or blank. */
export function missingRequiredEnvVars(): EnvVarName[] {
  return REQUIRED_ENV_VARS.filter((name) => {
    const value = process.env[name];
    return !value || value.trim() === "";
  });
}

/**
 * The presence of each required variable.
 *
 * Only the presence is reported. The values are never returned, so this can be
 * shown in a response without leaking anything.
 */
export function envVarPresence(): Record<EnvVarName, EnvVarState> {
  const missing = new Set(missingRequiredEnvVars());

  return Object.fromEntries(
    REQUIRED_ENV_VARS.map((name) => [
      name,
      missing.has(name) ? "missing" : "present",
    ]),
  ) as Record<EnvVarName, EnvVarState>;
}
