/**
 * Takes a backup of the scheme data.
 *
 *   npm run db:backup
 *   npm run db:backup -- backups/my-backup.json
 *
 * Every table is exported to a single JSON file. The file contains the whole
 * scheme - members, rounds, obligations, payments, payouts and the audit trail
 * - and can be restored with `npm run db:restore`.
 *
 * The output directory is gitignored: a backup contains personal information.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { loadProjectEnv, normalizeConnectionUrl, projectRoot } from "./load-env.mjs";

loadProjectEnv();

const { Client } = pg;

/** Export order matters: the restore inserts parents before children. */
const TABLES = [
  "members",
  "monthly_rounds",
  "contribution_obligations",
  "payments",
  "payouts",
  "share_groups",
  "share_group_members",
  "audit_logs",
];

async function main() {
  const url = process.env.DIRECT_URL;
  if (!url) {
    throw new Error("DIRECT_URL is not set. See .env.example.");
  }

  const client = new Client({
    connectionString: normalizeConnectionUrl(url),
    connectionTimeoutMillis: 15000,
  });
  await client.connect();

  const backup = {
    format: "yasir-ledger-backup",
    version: 1,
    createdAt: new Date().toISOString(),
    source: "supabase",
    tables: {},
  };

  try {
    for (const table of TABLES) {
      const { rows } = await client.query(
        `select * from public.${table} order by 1`,
      );
      // BigInt is not valid JSON, so amounts are stored as numbers.
      backup.tables[table] = rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            typeof value === "bigint" ? Number(value) : value,
          ]),
        ),
      );
    }
  } finally {
    await client.end();
  }

  const stamp = backup.createdAt.replace(/[:.]/g, "-");
  const target = process.argv[2]
    ? path.resolve(process.cwd(), process.argv[2])
    : path.join(projectRoot, "backups", `yasir-ledger-${stamp}.json`);

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(backup, null, 2), "utf8");

  console.log(`\nBackup written to ${target}\n`);
  for (const table of TABLES) {
    console.log(`  ${table.padEnd(28)} ${backup.tables[table].length} row(s)`);
  }
  console.log("");
}

main().catch((error) => {
  console.error(`\nBackup failed: ${error.message}`);
  process.exit(1);
});
