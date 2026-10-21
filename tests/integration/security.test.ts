/**
 * Security integration tests.
 *
 * Verifies the two layers that protect the financial data:
 *   1. Row Level Security denies the project's public publishable key.
 *   2. The audit trail is append-only, even for the application's own role.
 */
import { describe, expect, it } from "vitest";
import { inRolledBackTransaction, testPrisma } from "./helpers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const FINANCIAL_TABLES = [
  "members",
  "monthly_rounds",
  "contribution_obligations",
  "payments",
  "payouts",
  "share_groups",
  "share_group_members",
  "audit_logs",
];

describe("row level security", () => {
  it("is enabled on every financial table", async () => {
    const rows = await testPrisma.$queryRaw<
      Array<{ relname: string; relrowsecurity: boolean }>
    >`
      select c.relname, c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    `;

    for (const table of FINANCIAL_TABLES) {
      const found = rows.find((row) => row.relname === table);
      expect(found, `${table} should exist`).toBeDefined();
      expect(found?.relrowsecurity, `${table} should have RLS enabled`).toBe(true);
    }
  });

  it("grants no policy to anon or authenticated", async () => {
    const rows = await testPrisma.$queryRaw<Array<{ count: bigint }>>`
      select count(*)::bigint as count from pg_policies where schemaname = 'public'
    `;

    expect(Number(rows[0].count)).toBe(0);
  });

  it("has no BYPASSRLS privilege for anon or authenticated", async () => {
    const rows = await testPrisma.$queryRaw<
      Array<{ rolname: string; rolbypassrls: boolean }>
    >`
      select rolname, rolbypassrls from pg_roles
      where rolname in ('anon', 'authenticated')
    `;

    for (const role of rows) {
      expect(role.rolbypassrls, `${role.rolname} must not bypass RLS`).toBe(false);
    }
  });
});

describe("the publishable key", () => {
  const skip = !SUPABASE_URL || !PUBLISHABLE_KEY;

  it.skipIf(skip)("cannot read any financial table", async () => {
    for (const table of FINANCIAL_TABLES) {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`,
        {
          headers: {
            apikey: PUBLISHABLE_KEY as string,
            Authorization: `Bearer ${PUBLISHABLE_KEY}`,
          },
        },
      );

      expect(
        response.ok,
        `${table} must not be readable with the publishable key (got ${response.status})`,
      ).toBe(false);
    }
  });

  it.skipIf(skip)("cannot insert into a financial table", async () => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/members`, {
      method: "POST",
      headers: {
        apikey: PUBLISHABLE_KEY as string,
        Authorization: `Bearer ${PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        slug: "attacker",
        full_name: "Attacker",
        default_contribution_amount: 1,
      }),
    });

    expect(response.ok).toBe(false);
  });

  it.skipIf(skip)("cannot delete from a financial table", async () => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/members?slug=eq.yasir`, {
      method: "DELETE",
      headers: {
        apikey: PUBLISHABLE_KEY as string,
        Authorization: `Bearer ${PUBLISHABLE_KEY}`,
      },
    });

    expect(response.ok).toBe(false);
  });
});

describe("the audit trail", () => {
  it("refuses an update", async () => {
    await inRolledBackTransaction(async (client) => {
      const entry = await client.auditLog.create({
        data: {
          actorId: "00000000-0000-4000-8000-000000000001",
          action: "test.append_only",
          entityType: "test",
        },
      });

      await expect(
        client.auditLog.update({
          where: { id: entry.id },
          data: { action: "test.tampered" },
        }),
      ).rejects.toThrow(/append-only/i);
    });
  });

  it("refuses a delete", async () => {
    await inRolledBackTransaction(async (client) => {
      const entry = await client.auditLog.create({
        data: {
          actorId: "00000000-0000-4000-8000-000000000001",
          action: "test.append_only",
          entityType: "test",
        },
      });

      await expect(
        client.auditLog.delete({ where: { id: entry.id } }),
      ).rejects.toThrow(/append-only/i);
    });
  });
});
