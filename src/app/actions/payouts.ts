"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { actionFailure, actionSuccess, type ActionResult } from "@/lib/action-result";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseLocalDateTime } from "@/lib/datetime";
import { rupeesToPaise } from "@/lib/money";

/**
 * Payout administration.
 *
 * A payout records who is due money in a round, how much was planned, and
 * separately how much was actually disbursed. The two are never derived from
 * one another.
 */

const updatePayoutSchema = z.object({
  payoutId: z.string().uuid("That payout could not be found"),
  plannedRupees: z.coerce
    .number({ message: "Enter the planned amount" })
    .min(0, "The planned amount cannot be negative")
    .max(10_000_000, "That amount looks too large"),
  actualRupees: z
    .union([z.coerce.number(), z.literal(""), z.null()])
    .optional()
    .transform((value) =>
      value === "" || value === null || value === undefined
        ? null
        : Number(value),
    )
    .refine(
      (value) => value === null || (Number.isFinite(value) && value >= 0),
      "The actual amount cannot be negative",
    ),
  status: z.enum(["planned", "paid", "cancelled"]),
  paidAt: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal("")),
  transactionReference: z
    .string()
    .trim()
    .max(120, "The reference is too long")
    .optional()
    .or(z.literal("")),
  note: z
    .string()
    .trim()
    .max(500, "The note is too long")
    .optional()
    .or(z.literal("")),
});

export type UpdatePayoutData = { payoutId: string };

export async function updatePayout(
  input: z.input<typeof updatePayoutSchema>,
): Promise<ActionResult<UpdatePayoutData>> {
  const session = await getSession();
  if (!session) {
    return actionFailure("Your session has expired. Please sign in again.");
  }

  const parsed = updatePayoutSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure(
      parsed.error.issues[0]?.message ?? "The payout could not be saved.",
    );
  }

  const existing = await prisma.payout.findUnique({
    where: { id: parsed.data.payoutId },
    include: {
      recipient: { select: { fullName: true } },
      round: { select: { roundName: true } },
    },
  });

  if (!existing) {
    return actionFailure("That payout could not be found.");
  }

  let paidAt: Date | null = null;
  if (parsed.data.paidAt && parsed.data.paidAt.length > 0) {
    try {
      paidAt = parseLocalDateTime(parsed.data.paidAt);
    } catch {
      return actionFailure("Enter a valid payment date.");
    }
  }

  const actualAmount =
    parsed.data.actualRupees === null
      ? null
      : rupeesToPaise(parsed.data.actualRupees);

  const payout = await prisma.$transaction(async (tx) => {
    const updated = await tx.payout.update({
      where: { id: parsed.data.payoutId },
      data: {
        plannedAmount: rupeesToPaise(parsed.data.plannedRupees),
        actualAmount,
        status: parsed.data.status,
        paidAt,
        transactionReference: parsed.data.transactionReference?.trim() || null,
        note: parsed.data.note?.trim() || null,
      },
    });

    await writeAuditLog(
      {
        action: "payout.updated",
        entityType: "payout",
        entityId: updated.id,
        before: {
          plannedAmount: existing.plannedAmount,
          actualAmount: existing.actualAmount,
          status: existing.status,
          recipient: existing.recipient.fullName,
          round: existing.round.roundName,
        },
        after: {
          plannedAmount: updated.plannedAmount,
          actualAmount: updated.actualAmount,
          status: updated.status,
          recipient: existing.recipient.fullName,
          round: existing.round.roundName,
        },
      },
      tx,
    );

    return updated;
  });

  revalidatePath("/timeline");
  revalidatePath("/dashboard");

  return actionSuccess({ payoutId: payout.id });
}

const addRecipientSchema = z.object({
  roundId: z.string().uuid("That month could not be found"),
  memberId: z.string().uuid("Select a valid member"),
  plannedRupees: z.coerce
    .number({ message: "Enter the planned amount" })
    .min(0, "The planned amount cannot be negative")
    .max(10_000_000, "That amount looks too large"),
});

export type AddRecipientData = { payoutId: string };

/** Schedules a recipient for a round. */
export async function addPayoutRecipient(
  input: z.input<typeof addRecipientSchema>,
): Promise<ActionResult<AddRecipientData>> {
  const session = await getSession();
  if (!session) {
    return actionFailure("Your session has expired. Please sign in again.");
  }

  const parsed = addRecipientSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure(
      parsed.error.issues[0]?.message ?? "The recipient could not be added.",
    );
  }

  const [round, member] = await Promise.all([
    prisma.monthlyRound.findUnique({
      where: { id: parsed.data.roundId },
      select: { id: true, roundName: true },
    }),
    prisma.member.findUnique({
      where: { id: parsed.data.memberId },
      select: { id: true, fullName: true },
    }),
  ]);

  if (!round) return actionFailure("That month could not be found.");
  if (!member) return actionFailure("That member could not be found.");

  const existing = await prisma.payout.findUnique({
    where: {
      roundId_recipientMemberId: {
        roundId: round.id,
        recipientMemberId: member.id,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return actionFailure(`${member.fullName} is already scheduled for ${round.roundName}.`);
  }

  const payout = await prisma.payout.create({
    data: {
      roundId: round.id,
      recipientMemberId: member.id,
      plannedAmount: rupeesToPaise(parsed.data.plannedRupees),
    },
  });

  await writeAuditLog({
    action: "payout.recipient_added",
    entityType: "payout",
    entityId: payout.id,
    after: {
      recipient: member.fullName,
      round: round.roundName,
      plannedAmount: payout.plannedAmount,
    },
  });

  revalidatePath("/timeline");
  revalidatePath("/dashboard");

  return actionSuccess({ payoutId: payout.id });
}

/** Removes a scheduled recipient. */
export async function removePayoutRecipient(
  payoutId: string,
): Promise<ActionResult<{ payoutId: string }>> {
  const session = await getSession();
  if (!session) {
    return actionFailure("Your session has expired. Please sign in again.");
  }

  const existing = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: {
      recipient: { select: { fullName: true } },
      round: { select: { roundName: true } },
    },
  });

  if (!existing) {
    return actionFailure("That payout could not be found.");
  }

  if (existing.actualAmount !== null || existing.status === "paid") {
    return actionFailure(
      "This payout has already been disbursed. Reverse the payment instead of removing it.",
    );
  }

  await prisma.payout.delete({ where: { id: payoutId } });

  await writeAuditLog({
    action: "payout.recipient_removed",
    entityType: "payout",
    entityId: payoutId,
    before: {
      recipient: existing.recipient.fullName,
      round: existing.round.roundName,
      plannedAmount: existing.plannedAmount,
    },
  });

  revalidatePath("/timeline");
  revalidatePath("/dashboard");

  return actionSuccess({ payoutId });
}
