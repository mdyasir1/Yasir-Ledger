"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { actionFailure, actionSuccess, type ActionResult } from "@/lib/action-result";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { rupeesToPaise } from "@/lib/money";

/**
 * Member administration.
 *
 * Changing a member's default contribution never changes a recorded
 * obligation or payment: obligations are stored per round and are only
 * edited explicitly.
 */

const updateMemberSchema = z.object({
  memberId: z.string().uuid("That member could not be found"),
  fullName: z
    .string()
    .trim()
    .min(1, "The name is required")
    .max(120, "The name is too long"),
  phoneNumber: z
    .string()
    .trim()
    .max(30, "The phone number is too long")
    .optional()
    .or(z.literal("")),
  defaultContributionRupees: z.coerce
    .number({ message: "Enter the default contribution" })
    .min(0, "The default contribution cannot be negative")
    .max(10_000_000, "That amount looks too large"),
  isActive: z.coerce.boolean(),
  notes: z
    .string()
    .trim()
    .max(500, "The note is too long")
    .optional()
    .or(z.literal("")),
});

export type UpdateMemberData = { memberId: string };

export async function updateMember(
  input: z.input<typeof updateMemberSchema>,
): Promise<ActionResult<UpdateMemberData>> {
  const session = await getSession();
  if (!session) {
    return actionFailure("Your session has expired. Please sign in again.");
  }

  const parsed = updateMemberSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure(
      parsed.error.issues[0]?.message ?? "The member could not be saved.",
    );
  }

  const existing = await prisma.member.findUnique({
    where: { id: parsed.data.memberId },
  });
  if (!existing) {
    return actionFailure("That member could not be found.");
  }

  const defaultContributionAmount = rupeesToPaise(
    parsed.data.defaultContributionRupees,
  );

  const member = await prisma.$transaction(async (tx) => {
    const updated = await tx.member.update({
      where: { id: parsed.data.memberId },
      data: {
        fullName: parsed.data.fullName,
        phoneNumber: parsed.data.phoneNumber?.trim() || null,
        defaultContributionAmount,
        isActive: parsed.data.isActive,
        notes: parsed.data.notes?.trim() || null,
      },
    });

    await writeAuditLog(
      {
        action: "member.updated",
        entityType: "member",
        entityId: updated.id,
        before: {
          fullName: existing.fullName,
          phoneNumber: existing.phoneNumber,
          defaultContributionAmount: existing.defaultContributionAmount,
          isActive: existing.isActive,
        },
        after: {
          fullName: updated.fullName,
          phoneNumber: updated.phoneNumber,
          defaultContributionAmount: updated.defaultContributionAmount,
          isActive: updated.isActive,
        },
      },
      tx,
    );

    return updated;
  });

  revalidatePath("/members");
  revalidatePath("/collections");
  revalidatePath("/dashboard");

  return actionSuccess({ memberId: member.id });
}

const createMemberSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "The name is required")
    .max(120, "The name is too long"),
  phoneNumber: z
    .string()
    .trim()
    .max(30, "The phone number is too long")
    .optional()
    .or(z.literal("")),
  defaultContributionRupees: z.coerce
    .number({ message: "Enter the default contribution" })
    .min(0, "The default contribution cannot be negative")
    .max(10_000_000, "That amount looks too large"),
});

export type CreateMemberData = { memberId: string };

/**
 * Adds a new member.
 *
 * The new member is not given obligations in past rounds: the plan requires
 * that a member added later is never back-filled into history.
 */
export async function createMember(
  input: z.input<typeof createMemberSchema>,
): Promise<ActionResult<CreateMemberData>> {
  const session = await getSession();
  if (!session) {
    return actionFailure("Your session has expired. Please sign in again.");
  }

  const parsed = createMemberSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure(
      parsed.error.issues[0]?.message ?? "The member could not be added.",
    );
  }

  const baseSlug = parsed.data.fullName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!baseSlug) {
    return actionFailure("The name could not be turned into a unique reference.");
  }

  // The slug is the stable lookup key, so it must not collide.
  let slug = baseSlug;
  let suffix = 2;
  while (
    await prisma.member.findUnique({ where: { slug }, select: { id: true } })
  ) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const member = await prisma.$transaction(async (tx) => {
    const created = await tx.member.create({
      data: {
        slug,
        fullName: parsed.data.fullName,
        phoneNumber: parsed.data.phoneNumber?.trim() || null,
        defaultContributionAmount: rupeesToPaise(
          parsed.data.defaultContributionRupees,
        ),
      },
    });

    await writeAuditLog(
      {
        action: "member.created",
        entityType: "member",
        entityId: created.id,
        after: {
          fullName: created.fullName,
          slug: created.slug,
          defaultContributionAmount: created.defaultContributionAmount,
        },
      },
      tx,
    );

    return created;
  });

  revalidatePath("/members");

  return actionSuccess({ memberId: member.id });
}
