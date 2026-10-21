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

export const prisma: PrismaClient = globalForPrisma.prisma ?? createPrismaClient();

if (!serverEnv.isProduction) {
  globalForPrisma.prisma = prisma;
}
