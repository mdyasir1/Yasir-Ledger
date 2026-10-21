import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Load `.env.local` (secrets, wins) and `.env` (fallback) into process.env.
 * dotenv never overwrites a variable that is already set, so the order matters.
 */
export function loadProjectEnv() {
  const localFile = path.join(projectRoot, ".env.local");
  const sharedFile = path.join(projectRoot, ".env");

  if (existsSync(localFile)) {
    loadEnv({ path: localFile, quiet: true });
  }
  if (existsSync(sharedFile)) {
    loadEnv({ path: sharedFile, quiet: true });
  }
}

export { projectRoot };

/**
 * node-postgres does not understand Prisma/pgbouncer query parameters and would
 * forward them to the server as connection options, which Postgres rejects.
 */
export function normalizeConnectionUrl(url) {
  const parsed = new URL(url);
  parsed.searchParams.delete("pgbouncer");
  parsed.searchParams.delete("connection_limit");
  parsed.searchParams.delete("schema");
  return parsed.toString();
}
