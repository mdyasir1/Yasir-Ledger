import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { serverEnv } from "@/lib/server-env";

/**
 * The Prisma client is created once per process. In development the module is
 * re-evaluated on every hot reload, so the instance is cached on `globalThis` to
 * avoid exhausting the database's connection pool.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: serverEnv.databaseUrl,
  });

  return new PrismaClient({
    adapter,
    log: serverEnv.isProduction ? ["error"] : ["error", "warn"],
  });
}

let activeClient: PrismaClient | undefined;

/**
 * The client that application code should use.
 *
 * `withClient` swaps it for the duration of a callback, which lets the
 * integration tests run every write inside a transaction that is rolled back,
 * so the administrator's real data is never touched by a test run.
 */
export function getPrisma(): PrismaClient {
  if (activeClient) return activeClient;

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

/** Runs `callback` with `client` substituted for the shared client. */
export async function withClient<T>(
  client: PrismaClient,
  callback: () => Promise<T>,
): Promise<T> {
  const previous = activeClient;
  activeClient = client;
  try {
    return await callback();
  } finally {
    activeClient = previous;
  }
}

/**
 * A convenience wrapper around the active client.
 *
 * `prisma.member.findMany(...)` resolves to the active client, so existing
 * call sites do not need to change.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrisma();
    const value = client[property as keyof PrismaClient];

    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value;
  },
});
