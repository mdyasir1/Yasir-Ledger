import { afterEach, describe, expect, it } from "vitest";
import {
  REQUIRED_ENV_VARS,
  envVarPresence,
  missingRequiredEnvVars,
} from "./env-report";

const original = { ...process.env };

afterEach(() => {
  process.env = { ...original };
});

describe("env reporting", () => {
  it("lists every required variable", () => {
    expect([...REQUIRED_ENV_VARS].sort()).toEqual([
      "ADMIN_EMAIL",
      "ADMIN_PASSWORD",
      "DATABASE_URL",
      "DIRECT_URL",
      "SESSION_SECRET",
    ]);
  });

  it("reports nothing missing when all are set", () => {
    for (const name of REQUIRED_ENV_VARS) process.env[name] = "value";

    expect(missingRequiredEnvVars()).toEqual([]);
    expect(envVarPresence().DATABASE_URL).toBe("present");
  });

  it("reports a variable that is absent", () => {
    for (const name of REQUIRED_ENV_VARS) process.env[name] = "value";
    delete process.env.DATABASE_URL;

    expect(missingRequiredEnvVars()).toEqual(["DATABASE_URL"]);
    expect(envVarPresence().DATABASE_URL).toBe("missing");
  });

  it("treats a blank value as missing", () => {
    for (const name of REQUIRED_ENV_VARS) process.env[name] = "value";
    process.env.ADMIN_PASSWORD = "   ";

    expect(missingRequiredEnvVars()).toEqual(["ADMIN_PASSWORD"]);
  });

  it("never returns a value, only a state", () => {
    for (const name of REQUIRED_ENV_VARS) process.env[name] = "super-secret";

    const presence = envVarPresence();
    expect(JSON.stringify(presence)).not.toContain("super-secret");
  });
});
