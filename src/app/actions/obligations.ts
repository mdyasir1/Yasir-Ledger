"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { actionFailure, actionSuccess, type ActionResult } from "@/lib/action-result";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rupeesToPaise } from "@/lib/money";

/**
 * Contribution obligations.
 *
 * An obligation is what one member owes in one round. It is edited explicitly
 * and never changes as a side effect of editing a member's default.
 */

const updateObligationSchema = z.object({
  obligationId: z.string().uuid("That obligation could not be found"),
  expectedRupees: z.coerce
    .number({ message: "Enter the expected amount" })
    .min(0, "The expected amount cannot be negative")
    .max(10_000_000, "That amount looks too large"),
  isApplicable: z.coerce.boolean(),
  notes: z
    .string()
    .trim()
    .max(500, "The note is too long")
    .optional()
    .or(z.literal("")),
});

export type UpdateObligationData = { obligationId: string };

export async function updateObligation(
  input: z.input<typeof updateObligationSchema>,
): Promise<ActionResult<UpdateObligationData>> {
  const session = await getSession();
  if (!session) {
    return actionFailure("Your session has expired. Please sign in again.");
  }

  const parsed = updateObligationSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure(
      parsed.error.issues[0]?.message ?? "The obligation could not be saved.",
    );
  }

  const existing = await prisma.contributionObligation.findUnique({
    where: { id: parsed.data.obligationId },
    include: {
      member: { select: { fullName: true } },
      round: { select: { roundName: true } },
    },
  });

  if (!existing) {
    return actionFailure("That obligation could not be found.");
  }

  const expectedAmount = rupeesToPaise(parsed.data.expectedRupees);

  const obligation = await prisma.$transaction(async (tx) => {
    const updated = await tx.contributionObligation.update({
      where: { id: parsed.data.obligationId },
      data: {
        expectedAmount,
        isApplicable: parsed.data.isApplicable,
        notes: parsed.data.notes?.trim() || null,
      },
    });

    await writeAuditLog(
      {
        action: "obligation.updated",
        entityType: "contribution_obligation",
        entityId: updated.id,
        before: {
          expectedAmount: existing.expectedAmount,
          isApplicable: existing.isApplicable,
          member: existing.member.fullName,
          round: existing.round.roundName,
        },
        after: {
          expectedAmount: updated.expectedAmount,
          isApplicable: updated.isApplicable,
          member: existing.member.fullName,
          round: existing.round.roundName,
        },
      },
      tx,
    );

    return updated;
  });

  revalidatePath("/collections");
  revalidatePath("/dashboard");
  revalidatePath("/members");

  return actionSuccess({ obligationId: obligation.id });
}
