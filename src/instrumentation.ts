/**
 * Runs once per server instance, before the first request is served.
 *
 * The purpose is a single clear line in the platform logs when a deployment is
 * missing something, instead of a stack trace deep inside a page render.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { missingRequiredEnvVars } = await import("@/lib/env-report");
  const missing = missingRequiredEnvVars();

  if (missing.length > 0) {
    console.error(
      `[Yasir Ledger] Missing environment variables: ${missing.join(", ")}`,
    );
  }
}
