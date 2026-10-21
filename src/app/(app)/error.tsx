"use client";

import { useEffect } from "react";
import { Activity, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sanitizeErrorMessage } from "@/lib/sanitize";

/**
 * Turns a known failure into a sentence a person can act on.
 *
 * In a production build React replaces the message of a server error with a
 * minified reference, and keeps the real message in the server log under the
 * digest. That is deliberate, so the real cause is not available here. The
 * diagnostic endpoint can still report it, because it runs on the server.
 */
function explain(message: string): string {
  if (message.includes("Missing required environment variable")) {
    const name = message.match(
      /Missing required environment variable:\s*(\w+)/,
    )?.[1];
    if (name === "DATABASE_URL") {
      return "The database is not configured on this deployment, so no figures can be loaded.";
    }
    return `This deployment is missing the ${name} setting, so it cannot start properly.`;
  }

  if (
    message.includes("password authentication failed") ||
    message.includes("P1000")
  ) {
    return "The database rejected the credentials, so the connection settings need correcting.";
  }

  if (
    message.includes("Can't reach database server") ||
    message.includes("P1001") ||
    message.includes("ENOTFOUND") ||
    message.includes("ECONNREFUSED")
  ) {
    return "The database could not be reached, so the connection settings need correcting.";
  }

  if (message.includes("too many clients") || message.includes("P2024")) {
    return "The database connection pool is full. The pool size or the pooler may need adjusting.";
  }

  if (message.includes("Minified React error")) {
    return "The server could not load this screen. The exact cause is in the platform logs under the reference below, and the diagnostic will say what is wrong.";
  }

  return "Something went wrong while loading this screen. The details are below.";
}

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message = error.message || "Unknown error";
  const detail = sanitizeErrorMessage(message);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg space-y-5">
        <div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="font-display text-[1.5rem] leading-none font-semibold tracking-[-0.03em]">
            This screen could not be loaded
          </h1>
          <p className="text-[0.875rem] leading-relaxed text-muted-foreground">
            {explain(message)}
          </p>
        </div>

        <pre className="overflow-x-auto rounded-xl border border-border/70 bg-muted/50 p-3.5 font-mono text-[0.75rem] leading-relaxed text-muted-foreground">
          {detail}
        </pre>

        {error.digest ? (
          <p className="text-[0.6875rem] text-muted-foreground">
            Reference for the platform logs: {error.digest}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={reset}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </Button>
          <Button variant="outline" render={<a href="/api/health" target="_blank" />}>
            <Activity className="size-4" aria-hidden="true" />
            Run the diagnostic
          </Button>
        </div>
      </div>
    </div>
  );
}
