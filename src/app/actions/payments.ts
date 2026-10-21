"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { ADMIN_ACTOR_ID, writeAuditLog } from "@/lib/audit";
import { actionFailure, actionSuccess, type ActionResult } from "@/lib/action-result";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseLocalDateTime } from "@/lib/datetime";
import { rupeesToPaise } from "@/lib/money";

/**
 * Payment recording and reversal.
 *
 * Every action re-verifies the session. The proxy already blocks unauthenticated
 * requests, but a Server Function is a POST to its own route, so the check is
 * repeated here rather than trusted from one layer.
 */

const recordPaymentSchema = z.object({
  roundId: z.string().uuid("Select a valid month"),
  memberId: z.string().uuid("Select a valid member"),
  amountRupees: z.coerce
    .number({ message: "Enter the amount received" })
    .positive("The amount must be greater than zero")
    .max(10_000_000, "That amount looks too large"),
  paymentMethod: z.enum(["upi", "bank_transfer", "cash", "other"], {
    message: "Select how the payment was made",
  }),
  receivedAt: z
    .string()
    .min(1, "Enter the date the payment was received")
    .max(40),
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
  idempotencyKey: z
    .string()
    .min(8)
    .max(120)
    .optional()
    .or(z.literal("")),
});

export type RecordPaymentInput = z.input<typeof recordPaymentSchema>;

export type RecordPaymentData = {
  paymentId: string;
  /** True when an earlier submission with the same key was returned as-is. */
  duplicate: boolean;
};

/**
 * The form-shaped entry point used by the payment dialog.
 *
 * React's `useActionState` requires an action of the form
 * `(previousState, formData)`, so the form values are read here and handed to
 * `recordPayment`.
 */
export async function recordPaymentForm(
  _previousState: ActionResult<RecordPaymentData> | undefined,
  formData: FormData,
): Promise<ActionResult<RecordPaymentData> | undefined> {
  return recordPayment({
    roundId: String(formData.get("roundId") ?? ""),
    memberId: String(formData.get("memberId") ?? ""),
    amountRupees: formData.get("amountRupees") as unknown as number,
    paymentMethod: String(
      formData.get("paymentMethod") ?? "other",
    ) as RecordPaymentInput["paymentMethod"],
    receivedAt: String(formData.get("receivedAt") ?? ""),
    transactionReference: String(formData.get("transactionReference") ?? ""),
    note: String(formData.get("note") ?? ""),
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
  });
}

/**
 * Records a payment.
 *
 * The submission carries an idempotency key. A repeated submission with the
 * same key returns the payment that was already stored instead of creating a
 * second transaction, so a double tap or a retried request can never record
 * the same money twice.
 */
export async function recordPayment(
  input: RecordPaymentInput,
): Promise<ActionResult<RecordPaymentData>> {
  const session = await getSession();
  if (!session) {
    return actionFailure("Your session has expired. Please sign in again.");
  }

  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure(
      parsed.error.issues[0]?.message ?? "The payment could not be recorded.",
    );
  }

  const amount = rupeesToPaise(parsed.data.amountRupees);
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    return actionFailure("The amount must be greater than zero.");
  }

  let receivedAt: Date;
  try {
    receivedAt = parseLocalDateTime(parsed.data.receivedAt);
  } catch {
    return actionFailure("Enter a valid date for the payment.");
  }

  const idempotencyKey =
    parsed.data.idempotencyKey && parsed.data.idempotencyKey.length > 0
      ? parsed.data.idempotencyKey
      : randomUUID();

  // The fast path for a repeated submission: if this key was already used,
  // return the payment that is already stored and write nothing.
  const alreadyStored = await prisma.payment.findUnique({
    where: { idempotencyKey },
    select: { id: true },
  });

  if (alreadyStored) {
    return actionSuccess({ paymentId: alreadyStored.id, duplicate: true });
  }

  const member = await prisma.member.findUnique({
    where: { id: parsed.data.memberId },
    select: { id: true, fullName: true, isActive: true },
  });
  if (!member) {
    return actionFailure("That member no longer exists.");
  }

  const round = await prisma.monthlyRound.findUnique({
    where: { id: parsed.data.roundId },
    select: { id: true, roundName: true },
  });
  if (!round) {
    return actionFailure("That month no longer exists.");
  }

  try {
    // The payment and its audit entry are written together. The insert runs in
    // its own transaction so that a unique-constraint violation is contained:
    // Postgres aborts a transaction that hits a constraint violation, so the
    // recovery lookup below must happen outside it.
    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          roundId: round.id,
          memberId: member.id,
          amount,
          paymentMethod: parsed.data.paymentMethod,
          receivedAt,
          transactionReference:
            parsed.data.transactionReference?.trim() || null,
          note: parsed.data.note?.trim() || null,
          idempotencyKey,
          createdBy: ADMIN_ACTOR_ID,
        },
      });

      await writeAuditLog(
        {
          action: "payment.recorded",
          entityType: "payment",
          entityId: created.id,
          after: {
            amount,
            member: member.fullName,
            round: round.roundName,
            paymentMethod: parsed.data.paymentMethod,
            receivedAt,
          },
        },
        tx,
      );

      return created;
    });

    revalidatePath("/dashboard");
    revalidatePath("/collections");
    revalidatePath("/transactions");

    return actionSuccess({ paymentId: payment.id, duplicate: false });
  } catch (error) {
    // The unique index on idempotency_key is the last line of defence against
    // a duplicate submission. If the key already exists, the earlier payment
    // is returned rather than a second one being written.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.payment.findUnique({
        where: { idempotencyKey },
        select: { id: true },
      });

      if (existing) {
        return actionSuccess({ paymentId: existing.id, duplicate: true });
      }
    }

    throw error;
  }
}

const reversePaymentSchema = z.object({
  paymentId: z.string().uuid("That payment could not be found"),
  reason: z
    .string()
    .trim()
    .max(500, "The reason is too long")
    .optional()
    .or(z.literal("")),
});

export type ReversePaymentData = {
  reversalId: string;
};

/**
 * Reverses a payment.
 *
 * The original payment is never deleted. A compensating entry is written that
 * points at it, and both the original and the reversal are excluded from the
 * collection totals. The full history stays visible in the ledger.
 */
export async function reversePayment(
  input: z.input<typeof reversePaymentSchema>,
): Promise<ActionResult<ReversePaymentData>> {
  const session = await getSession();
  if (!session) {
    return actionFailure("Your session has expired. Please sign in again.");
  }

  const parsed = reversePaymentSchema.safeParse(input);
  if (!parsed.success) {
    return actionFailure(
      parsed.error.issues[0]?.message ?? "The payment could not be reversed.",
    );
  }

  const original = await prisma.payment.findUnique({
    where: { id: parsed.data.paymentId },
    include: { member: { select: { fullName: true } }, reversedBy: true },
  });

  if (!original) {
    return actionFailure("That payment could not be found.");
  }

  if (original.reversalOfPaymentId) {
    return actionFailure("That entry is itself a reversal and cannot be reversed.");
  }

  if (original.reversedBy.length > 0) {
    return actionFailure("That payment has already been reversed.");
  }

  const reversal = await prisma.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        roundId: original.roundId,
        memberId: original.memberId,
        amount: original.amount,
        paymentMethod: original.paymentMethod,
        receivedAt: new Date(),
        transactionReference: original.transactionReference,
        note: parsed.data.reason?.trim() || "Reversal",
        idempotencyKey: `reversal:${original.id}:${randomUUID()}`,
        createdBy: ADMIN_ACTOR_ID,
        reversalOfPaymentId: original.id,
      },
    });

    await writeAuditLog(
      {
        action: "payment.reversed",
        entityType: "payment",
        entityId: original.id,
        before: {
          amount: original.amount,
          member: original.member.fullName,
          receivedAt: original.receivedAt,
          paymentMethod: original.paymentMethod,
        },
        after: {
          reversalId: created.id,
          reason: parsed.data.reason?.trim() || "Reversal",
        },
      },
      tx,
    );

    return created;
  });

  revalidatePath("/dashboard");
  revalidatePath("/collections");
  revalidatePath("/transactions");

  return actionSuccess({ reversalId: reversal.id });
}
