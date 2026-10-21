"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { sanitizeErrorMessage } from "@/lib/sanitize";

/**
 * The last line of defence. This renders when the root layout itself fails, so
 * it has to supply its own document shell.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#fbfaf8",
          color: "#1c1c22",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "32rem", display: "grid", gap: "1.25rem" }}>
          <div
            style={{
              width: "2.75rem",
              height: "2.75rem",
              borderRadius: "0.75rem",
              background: "rgba(220,38,38,0.1)",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
            }}
            aria-hidden="true"
          >
            <AlertTriangle />
          </div>

          <div style={{ display: "grid", gap: "0.5rem" }}>
            <h1
              style={{
                margin: 0,
                fontSize: "1.5rem",
                fontWeight: 600,
                letterSpacing: "-0.03em",
              }}
            >
              Yasir Ledger could not start
            </h1>
            <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.6, opacity: 0.7 }}>
              The application could not be loaded. The details are below.
            </p>
          </div>

          <pre
            style={{
              margin: 0,
              padding: "0.875rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(28,28,34,0.1)",
              background: "rgba(28,28,34,0.04)",
              fontSize: "0.75rem",
              lineHeight: 1.6,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {sanitizeErrorMessage(error.message || "Unknown error")}
          </pre>

          <div>
            <button
              type="button"
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.625rem 1rem",
                borderRadius: "0.7rem",
                border: "none",
                background: "#1c1c22",
                color: "#fbfaf8",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
