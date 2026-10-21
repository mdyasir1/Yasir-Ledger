"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { actionFailure, actionSuccess, type ActionResult } from "@/lib/action-result";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rupeesToPaise } from "@/lib/money";

/** Round administration: status, target and notes. */

const updateRoundSchema = z.object({
  roundId: z.string().uuid("That month could not be found"),
  collectionTargetRupees: z.coerce
    .number({ message: "Enter the collection target" })
    .min(0, "The target cannot be negative")
    .max(100_000_000, "That amount looks too large"),
  status: z.enum(["open", "closed"]),
  notes: z
    .string()
    .trim()
    .max(500, "The note is too long")
    .optional()
    .or(z.literal("")),
});

export type UpdateRoundData = { roundId: string };

export async function updateRound(
  input: z.input<typeof updateRoundSchema>,
): Promise<ActionResult<UpdateRoundData>> {
  const session = await getSession();
  if (!session) {
    return actionFailure("Your session has expired. Please sign in again.");
  }

  const parsed = updateRoundSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure(
      parsed.error.issues[0]?.message ?? "The month could not be saved.",
    );
  }

  const existing = await prisma.monthlyRound.findUnique({
    where: { id: parsed.data.roundId },
  });
  if (!existing) {
    return actionFailure("That month could not be found.");
  }

  const collectionTarget = rupeesToPaise(
    parsed.data.collectionTargetRupees,
  );

  const round = await prisma.$transaction(async (tx) => {
    const updated = await tx.monthlyRound.update({
      where: { id: parsed.data.roundId },
      data: {
        collectionTarget,
        status: parsed.data.status,
        notes: parsed.data.notes?.trim() || null,
      },
    });

    await writeAuditLog(
      {
        action: "round.updated",
        entityType: "monthly_round",
        entityId: updated.id,
        before: {
          collectionTarget: existing.collectionTarget,
          status: existing.status,
          notes: existing.notes,
        },
        after: {
          collectionTarget: updated.collectionTarget,
          status: updated.status,
          notes: updated.notes,
        },
      },
      tx,
    );

    return updated;
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/collections");
  revalidatePath("/timeline");

  return actionSuccess({ roundId: round.id });
}
