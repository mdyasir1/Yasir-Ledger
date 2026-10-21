/**
 * Restores a backup taken by `npm run db:backup`.
 *
 *   npm run db:restore -- backups/my-backup.json
 *
 * The restore runs inside a transaction: if anything fails, the database is
 * left exactly as it was.
 *
 * The audit trail is restored last and only for rows that do not exist yet.
 * The audit log is append-only, so a restore can add the missing history but
 * can never rewrite it.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { loadProjectEnv, normalizeConnectionUrl } from "./load-env.mjs";

loadProjectEnv();

const { Client } = pg;

/** Parents first, children after. */
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
  const source = process.argv[2];
  if (!source) {
    throw new Error(
      "Usage: npm run db:restore -- <path-to-backup.json>",
    );
  }

  const url = process.env.DIRECT_URL;
  if (!url) {
    throw new Error("DIRECT_URL is not set. See .env.example.");
  }

  const raw = JSON.parse(
    await readFile(path.resolve(process.cwd(), source), "utf8"),
  );

  if (raw.format !== "yasir-ledger-backup") {
    throw new Error("That file is not a Yasir Ledger backup.");
  }

  const client = new Client({
    connectionString: normalizeConnectionUrl(url),
    connectionTimeoutMillis: 15000,
  });
  await client.connect();

  try {
    await client.query("begin");

    for (const table of TABLES) {
      const rows = raw.tables?.[table] ?? [];

      if (table === "audit_logs") {
        // Append only: never touch the rows that are already there.
        for (const row of rows) {
          await client.query(
            `insert into public.audit_logs
               (id, actor_id, action, entity_type, entity_id, before_data, after_data, created_at)
             values ($1, $2, $3, $4, $5, $6, $7, $8)
             on conflict (id) do nothing`,
            [
              row.id,
              row.actor_id,
              row.action,
              row.entity_type,
              row.entity_id,
              row.before_data ? JSON.stringify(row.before_data) : null,
              row.after_data ? JSON.stringify(row.after_data) : null,
              row.created_at,
            ],
          );
        }
        continue;
      }

      await client.query(`delete from public.${table}`);

      if (rows.length === 0) continue;

      const columns = Object.keys(rows[0]);
      const columnList = columns.join(", ");
      const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");

      for (const row of rows) {
        await client.query(
          `insert into public.${table} (${columnList}) values (${placeholders})`,
          columns.map((column) => row[column]),
        );
      }
    }

    await client.query("commit");

    console.log("\nRestore complete.\n");
    for (const table of TABLES) {
      const { rows } = await client.query(
        `select count(*)::int as count from public.${table}`,
      );
      console.log(`  ${table.padEnd(28)} ${rows[0].count} row(s)`);
    }
    console.log("");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`\nRestore failed: ${error.message}`);
  process.exit(1);
});
