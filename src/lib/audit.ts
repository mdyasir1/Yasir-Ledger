import { prisma } from "@/lib/db";
import type { PrismaClient } from "@/generated/prisma/client";

/**
 * The single administrator's actor identifier.
 *
 * There is exactly one administrator, so the audit trail records one stable
 * UUID instead of a reference into an authentication provider's user table.
 * The column stays a UUID so a future multi-user version needs no migration.
 */
export const ADMIN_ACTOR_ID = "00000000-0000-4000-8000-000000000001";

/** Convert a value into something that can be stored in a `jsonb` column. */
export function toJsonSafe(value: unknown): unknown {
  if (typeof value === "bigint") return Number(value);
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toJsonSafe);
  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      output[key] = toJsonSafe(entry);
    }
    return output;
  }
  return value;
}

/**
 * Writes an entry to the audit trail.
 *
 * `audit_logs` is append-only: the database rejects any update or delete,
 * including from the application role.
 *
 * The client can be supplied so that the audit entry is written in the same
 * transaction as the change it describes.
 */
export async function writeAuditLog(
  entry: {
    action: string;
    entityType: string;
    entityId?: string | null;
    before?: unknown;
    after?: unknown;
  },
  client: Pick<PrismaClient, "auditLog"> = prisma,
): Promise<void> {
  await client.auditLog.create({
    data: {
      actorId: ADMIN_ACTOR_ID,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      beforeData:
        entry.before === undefined
          ? undefined
          : (toJsonSafe(entry.before) as never),
      afterData:
        entry.after === undefined ? undefined : (toJsonSafe(entry.after) as never),
    },
  });
}
