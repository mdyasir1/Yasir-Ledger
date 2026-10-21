/**
 * Runs the idempotent seed.
 *
 *   npm run db:seed
 *
 * The seed itself lives in `supabase/seed.sql` so that the same file can be
 * pasted into the Supabase SQL editor. This script simply executes it.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { loadProjectEnv, normalizeConnectionUrl, projectRoot } from "./load-env.mjs";

loadProjectEnv();

const { Client } = pg;

async function main() {
  const url = process.env.DIRECT_URL;
  if (!url) {
    throw new Error("DIRECT_URL is not set. See .env.example.");
  }

  const seedFile = path.join(projectRoot, "supabase", "seed.sql");
  const sql = await readFile(seedFile, "utf8");

  const client = new Client({
    connectionString: normalizeConnectionUrl(url),
    connectionTimeoutMillis: 15000,
  });
  await client.connect();

  try {
    const before = await countRows(client);

    await client.query("begin");
    await client.query(sql);
    await client.query("commit");

    const after = await countRows(client);

    console.log("\nSeed complete.\n");
    console.log("  table                      before   after");
    console.log("  -------------------------  -------  -------");
    for (const key of Object.keys(after)) {
      console.log(
        `  ${key.padEnd(25)}  ${String(before[key] ?? 0).padStart(7)}  ${String(after[key]).padStart(5)}`,
      );
    }
    console.log(
      "\n  Unchanged counts mean the seed was already applied and is idempotent.\n",
    );
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

async function countRows(client) {
  const tables = [
    "members",
    "monthly_rounds",
    "contribution_obligations",
    "payouts",
    "payments",
  ];
  const counts = {};

  for (const table of tables) {
    const { rows } = await client.query(
      `select count(*)::int as count from public.${table}`,
    );
    counts[table] = rows[0].count;
  }

  return counts;
}

main().catch((error) => {
  console.error(`\nSeed failed: ${error.message}`);
  process.exit(1);
});
