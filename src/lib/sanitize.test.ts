import { describe, expect, it } from "vitest";
import { sanitizeErrorMessage } from "./sanitize";

describe("sanitizeErrorMessage", () => {
  it("removes the password from a connection string", () => {
    const message =
      "Error: P1000: Authentication failed against database server, the provided database credentials for `postgres` are not valid.";

    const sanitized = sanitizeErrorMessage(
      "postgresql://postgres:sup3rSecret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
    );

    expect(sanitized).not.toContain("sup3rSecret");
    expect(sanitized).toContain("***");
    expect(message).toContain("P1000");
  });

  it("removes credentials from any url with user info", () => {
    expect(
      sanitizeErrorMessage("failed to connect to https://user:hunter2@example.com/x"),
    ).not.toContain("hunter2");
  });

  it("removes a named secret from a message", () => {
    const sanitized = sanitizeErrorMessage(
      "connection failed, password=letmein, retrying",
    );

    expect(sanitized).not.toContain("letmein");
    expect(sanitized).toContain("password=***");
  });

  it("removes a secret from a query string", () => {
    const sanitized = sanitizeErrorMessage(
      "GET /api?token=abcdef123456&page=2 failed",
    );

    expect(sanitized).not.toContain("abcdef123456");
    expect(sanitized).toContain("page=2");
  });

  it("leaves an ordinary message alone", () => {
    const message = "Missing required environment variable: DATABASE_URL.";
    expect(sanitizeErrorMessage(message)).toBe(message);
  });
});
