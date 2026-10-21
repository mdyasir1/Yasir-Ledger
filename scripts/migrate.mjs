/**
 * Applies the version-controlled SQL migrations in `supabase/migrations/`.
 *
 *   npm run db:migrate
 *
 * Each file is applied inside a transaction and recorded in the
 * `schema_migrations` ledger together with a checksum. A file whose contents
 * changed after it was applied is reported as an error rather than silently
 * re-applied, so the history of the database stays trustworthy.
 */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { loadProjectEnv, normalizeConnectionUrl, projectRoot } from "./load-env.mjs";

loadProjectEnv();

const { Client } = pg;
const migrationsDir = path.join(projectRoot, "supabase", "migrations");

function checksum(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

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

  try {
    await client.query(`
      create table if not exists public.schema_migrations (
        version     text primary key,
        name        text        not null,
        checksum    text        not null,
        applied_at  timestamptz not null default now()
      )
    `);

    const files = (await readdir(migrationsDir))
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("No migration files found.");
      return;
    }

    const { rows: applied } = await client.query(
      "select version, name, checksum from public.schema_migrations order by version",
    );
    const appliedByVersion = new Map(applied.map((row) => [row.version, row]));

    let count = 0;

    for (const file of files) {
      const version = file.replace(/\.sql$/, "");
      const contents = await readFile(path.join(migrationsDir, file), "utf8");
      const digest = checksum(contents);

      const previous = appliedByVersion.get(version);
      if (previous) {
        if (previous.checksum !== digest) {
          throw new Error(
            `Migration ${version} has changed since it was applied. ` +
              `Create a new migration file instead of editing an applied one.`,
          );
        }
        console.log(`  [skip]  ${file}`);
        continue;
      }

      process.stdout.write(`  [apply] ${file} ... `);
      try {
        await client.query("begin");
        await client.query(contents);
        await client.query(
          `insert into public.schema_migrations (version, name, checksum)
           values ($1, $2, $3)`,
          [version, file, digest],
        );
        await client.query("commit");
        console.log("ok");
        count += 1;
      } catch (error) {
        await client.query("rollback");
        console.log("FAILED");
        throw error;
      }
    }

    console.log(
      `\n${count === 0 ? "Database is up to date" : `Applied ${count} migration(s)`}.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`\nMigration failed: ${error.message}`);
  process.exit(1);
});
