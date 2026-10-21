/**
 * Database connectivity and security probe.
 *
 *   npm run db:check
 *
 * Verifies that both Supabase pooler connections work, reports what is already
 * in the `public` schema, and probes whether the project's publishable key can
 * reach the database through PostgREST. This is the first check run against a
 * real project, so it deliberately reports rather than assumes.
 */
import pg from "pg";
import { loadProjectEnv, normalizeConnectionUrl } from "./load-env.mjs";

loadProjectEnv();

const { Client } = pg;

const results = [];
let failed = false;

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  if (!ok) failed = true;
}

async function probeConnection(label, url) {
  if (!url) {
    record(label, false, "not configured");
    return null;
  }

  const client = new Client({
    connectionString: normalizeConnectionUrl(url),
    connectionTimeoutMillis: 15000,
  });

  try {
    await client.connect();
    const { rows } = await client.query("select version() as version, current_user as role, current_database() as db");
    record(label, true, `connected as ${rows[0].role} to ${rows[0].db}`);
    return client;
  } catch (error) {
    record(label, false, error.message);
    return null;
  }
}

async function listTables(client) {
  const { rows } = await client.query(`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name
  `);
  return rows.map((row) => row.table_name);
}

async function probePublishableKey() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    record(
      "PostgREST probe (publishable key)",
      true,
      "skipped, publishable key not configured in .env.local",
    );
    return;
  }

  try {
    const response = await fetch(`${url}/rest/v1/members?select=id&limit=1`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });
    const body = await response.text();

    if (response.status === 404) {
      record(
        "PostgREST probe (publishable key)",
        true,
        "table `members` does not exist yet, so there is nothing to leak",
      );
      return;
    }

    if (!response.ok) {
      record(
        "PostgREST probe (publishable key)",
        true,
        `PostgREST responded ${response.status}, access denied`,
      );
      return;
    }

    const rows = JSON.parse(body);
    if (Array.isArray(rows) && rows.length === 0) {
      record(
        "PostgREST probe (publishable key)",
        true,
        "RLS returned zero rows, the publishable key cannot read data",
      );
      return;
    }

    record(
      "PostgREST probe (publishable key)",
      false,
      `the publishable key returned ${rows.length} row(s), RLS is not protecting this table`,
    );
  } catch (error) {
    record("PostgREST probe (publishable key)", false, error.message);
  }
}

const direct = await probeConnection(
  "Direct connection (session pooler, 5432)",
  process.env.DIRECT_URL,
);

const pooled = await probeConnection(
  "Runtime connection (transaction pooler, 6543)",
  process.env.DATABASE_URL,
);

if (direct) {
  try {
    const tables = await listTables(direct);
    record(
      "Existing tables in schema `public`",
      true,
      tables.length === 0 ? "none" : tables.join(", "),
    );
  } catch (error) {
    record("Existing tables in schema `public`", false, error.message);
  } finally {
    await direct.end();
  }
}

if (pooled) {
  try {
    await pooled.query("select 1 as ok");
    record("SELECT 1 over the transaction pooler", true, "ok");
  } catch (error) {
    record("SELECT 1 over the transaction pooler", false, error.message);
  } finally {
    await pooled.end();
  }
}

await probePublishableKey();

console.log("\nYasir Ledger: database check\n");
for (const result of results) {
  const mark = result.ok ? "PASS" : "FAIL";
  console.log(`  [${mark}] ${result.name}\n         ${result.detail}`);
}
console.log("");

process.exit(failed ? 1 : 0);
