/**
 * Integration test helpers.
 *
 * Every test runs inside a Prisma interactive transaction that is ALWAYS rolled
 * back, so the administrator's real data is never modified.
 *
 * The tests connect through the session-mode pooler (DIRECT_URL). The
 * transaction-mode pooler used at runtime cannot hold an interactive
 * transaction open across queries, because the underlying server connection may
 * be reassigned part-way through.
 */
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import { afterAll, beforeAll } from "vitest";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

/** A marker used to force the transaction to roll back. */
class RollbackSignal extends Error {
  constructor() {
    super("rollback");
    this.name = "RollbackSignal";
  }
}

function normalizeConnectionUrl(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.delete("pgbouncer");
  parsed.searchParams.delete("connection_limit");
  return parsed.toString();
}

export const testPrisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: normalizeConnectionUrl(
      process.env.DIRECT_URL as string,
    ),
  }),
  log: ["error"],
});

/**
 * Runs `body` inside a transaction and then rolls it back.
 *
 * The body receives a client bound to the transaction. `withClient` makes the
 * application's own code use it, so the real server actions run against the
 * transaction rather than the committed database.
 */
export async function inRolledBackTransaction<T>(
  body: (client: PrismaClient) => Promise<T>,
): Promise<T> {
  let outcome: T | undefined;
  let completed = false;

  try {
    await testPrisma.$transaction(async (tx) => {
      const { withClient } = await import("../../src/lib/db");
      const bound = tx as unknown as PrismaClient;

      outcome = await withClient(bound, () => body(bound));
      completed = true;

      // Throwing here makes Prisma roll the transaction back.
      throw new RollbackSignal();
    });
  } catch (error) {
    const isRollback =
      error instanceof RollbackSignal ||
      (error as Error)?.name === "RollbackSignal" ||
      (error as Error)?.message === "rollback";

    if (!isRollback) throw error;
  }

  if (!completed) {
    throw new Error("The integration test transaction did not complete.");
  }

  return outcome as T;
}

beforeAll(async () => {
  await testPrisma.$connect();
});

afterAll(async () => {
  await testPrisma.$disconnect();
});
