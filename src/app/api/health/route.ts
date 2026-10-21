import { cookies } from "next/headers";
import { appConfig } from "@/config/app";
import { envVarPresence, missingRequiredEnvVars } from "@/lib/env-report";
import { sanitizeErrorMessage } from "@/lib/sanitize";
import { verifySessionToken } from "@/lib/session";

export const dynamic = "force-dynamic";

type DatabaseReport = {
  reachable: boolean;
  latencyMs: number;
  error: string | null;
};

/**
 * A diagnostic endpoint for a deployment.
 *
 * It answers one question precisely: is the database configured, and can it be
 * reached? That is the difference between "the variable is absent" and "the
 * variable is present but the connection failed", which are two very different
 * problems that look identical from the browser.
 *
 * The endpoint is excluded from the route guard so it can answer with JSON, so
 * it checks the session itself and returns 401 without a valid cookie. It
 * reports the presence of each variable and never its value.
 */
export async function GET() {
  const presence = envVarPresence();
  const missing = missingRequiredEnvVars();

  const cookieStore = await cookies();
  const token = cookieStore.get(appConfig.sessionCookieName)?.value;
  const session = verifySessionToken(token, process.env.SESSION_SECRET ?? "");

  if (!session) {
    return Response.json(
      {
        status: "unauthorised",
        message: "Sign in to run the diagnostic.",
        environment: presence,
        missing,
      },
      { status: 401 },
    );
  }

  const database = await checkDatabase();

  return Response.json(
    {
      status: database.reachable ? "ok" : "error",
      environment: presence,
      missing,
      database,
      time: new Date().toISOString(),
    },
    { status: database.reachable ? 200 : 503 },
  );
}

async function checkDatabase(): Promise<DatabaseReport> {
  const started = Date.now();

  try {
    const { getPrisma } = await import("@/lib/db");
    const client = getPrisma();
    await client.$queryRaw`select 1`;

    return { reachable: true, latencyMs: Date.now() - started, error: null };
  } catch (error) {
    return {
      reachable: false,
      latencyMs: Date.now() - started,
      error: sanitizeErrorMessage(
        error instanceof Error ? error.message : String(error),
      ),
    };
  }
}
