"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { ArrowRight, Loader2, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  addPayoutRecipient,
  removePayoutRecipient,
  updatePayout,
} from "@/app/actions/payouts";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toLocalInputValue } from "@/lib/datetime";
import { formatPaise, paiseToRupees } from "@/lib/money";
import type { TimelineRecipient, TimelineRow } from "@/lib/data/timeline";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : null}
      {label}
    </Button>
  );
}

/** Edit one scheduled recipient. */
function PayoutEditor({
  recipient,
  onClose,
}: {
  recipient: TimelineRecipient;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(
    async (_previous: unknown, formData: FormData) =>
      updatePayout({
        payoutId: recipient.id,
        plannedRupees: Number(formData.get("plannedRupees") ?? 0),
        actualRupees: String(formData.get("actualRupees") ?? ""),
        status: String(
          formData.get("status") ?? "planned",
        ) as "planned" | "paid" | "cancelled",
        paidAt: String(formData.get("paidAt") ?? ""),
        transactionReference: String(formData.get("transactionReference") ?? ""),
        note: String(formData.get("note") ?? ""),
      }),
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Payout updated.");
      onClose();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, onClose]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit payout</DialogTitle>
          <DialogDescription>{recipient.fullName}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plannedRupees">Planned amount</Label>
            <Input
              id="plannedRupees"
              name="plannedRupees"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              defaultValue={paiseToRupees(recipient.plannedAmount)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="actualRupees">Amount actually disbursed</Label>
            <Input
              id="actualRupees"
              name="actualRupees"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="Leave empty until confirmed"
              defaultValue={
                recipient.actualAmount === null
                  ? ""
                  : paiseToRupees(recipient.actualAmount)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={recipient.status}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue>
                  {recipient.status === "paid"
                    ? "Paid"
                    : recipient.status === "cancelled"
                      ? "Cancelled"
                      : "Planned"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paidAt">Paid on</Label>
            <Input
              id="paidAt"
              name="paidAt"
              type="datetime-local"
              defaultValue={
                recipient.paidAt ? toLocalInputValue(recipient.paidAt) : ""
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transactionReference">Reference (optional)</Label>
            <Input
              id="transactionReference"
              name="transactionReference"
              defaultValue={recipient.transactionReference ?? ""}
              maxLength={120}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Input id="note" name="note" defaultValue={recipient.note ?? ""} maxLength={500} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <SubmitButton label="Save" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Schedule an additional recipient for a round. */
function AddRecipientDialog({
  roundId,
  roundName,
  candidates,
  onClose,
}: {
  roundId: string;
  roundName: string;
  candidates: Array<{ id: string; fullName: string }>;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(
    async (_previous: unknown, formData: FormData) =>
      addPayoutRecipient({
        roundId,
        memberId: String(formData.get("memberId") ?? ""),
        plannedRupees: Number(formData.get("plannedRupees") ?? 0),
      }),
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Recipient scheduled.");
      onClose();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, onClose]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule a recipient</DialogTitle>
          <DialogDescription>{roundName}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="memberId">Member</Label>
            <Select name="memberId">
              <SelectTrigger id="memberId" className="w-full">
                <SelectValue>Choose a member</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {candidates.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plannedRupees">Planned amount</Label>
            <Input
              id="plannedRupees"
              name="plannedRupees"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <SubmitButton label="Schedule" />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The Timeline screen: every round from October 2026 to July 2027. */
export function TimelineView({
  rows,
  members,
}: {
  rows: TimelineRow[];
  members: Array<{ id: string; fullName: string }>;
}) {
  const [editing, setEditing] = useState<TimelineRecipient | null>(null);
  const [addingTo, setAddingTo] = useState<TimelineRow | null>(null);

  /** Members who are not already scheduled for the round being edited. */
  function candidatesFor(row: TimelineRow) {
    const scheduled = new Set(row.recipients.map((entry) => entry.memberId));
    return members.filter((member) => !scheduled.has(member.id));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timeline"
        description="All ten rounds, with the scheduled recipients and what each round collected."
      />

      <div className="space-y-3">
        {rows.map((row) => {
          return (
            <Card key={row.id} className="shadow-none">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-semibold">{row.roundName}</h2>
                      <Badge variant={row.status === "open" ? "secondary" : "outline"}>
                        {row.status === "open" ? "Open" : "Closed"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatPaise(row.collectedTotal)} collected ·{" "}
                      {formatPaise(row.outstandingTotal)} outstanding ·{" "}
                      {row.paidCount} paid, {row.partiallyPaidCount} partial,{" "}
                      {row.pendingCount} pending
                    </p>
                  </div>

                  <Button variant="ghost" size="sm" render={<Link href={`/collections?round=${row.id}`} />}>
                    Collections
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border">
                    <div className="flex items-center justify-between border-b px-3 py-2">
                      <p className="text-sm font-medium">Recipients</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAddingTo(row)}
                      >
                        <UserPlus className="size-4" aria-hidden="true" />
                        Add
                      </Button>
                    </div>
                    {row.recipients.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-muted-foreground">
                        No recipients scheduled.
                      </p>
                    ) : (
                      <ul className="divide-y">
                        {row.recipients.map((recipient) => (
                          <li
                            key={recipient.id}
                            className="flex items-center justify-between gap-2 px-3 py-2"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {recipient.fullName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Planned {formatPaise(recipient.plannedAmount)}
                                {recipient.actualAmount !== null
                                  ? ` · Paid ${formatPaise(recipient.actualAmount)}`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Badge
                                variant={
                                  recipient.status === "paid" ? "secondary" : "outline"
                                }
                              >
                                {recipient.status}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Edit ${recipient.fullName}`}
                                onClick={() => setEditing(recipient)}
                              >
                                <span className="sr-only">Edit</span>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Remove ${recipient.fullName}`}
                                onClick={async () => {
                                  const result = await removePayoutRecipient(
                                    recipient.id,
                                  );
                                  if (result.ok) {
                                    toast.success("Recipient removed.");
                                  } else {
                                    toast.error(result.error);
                                  }
                                }}
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="flex justify-between border-t px-3 py-2 text-sm">
                      <span className="text-muted-foreground">Planned total</span>
                      <span className="font-semibold tabular-nums">
                        {formatPaise(row.plannedTotal)}
                      </span>
                    </div>
                    {row.actualTotal > 0 ? (
                      <div className="flex justify-between border-t px-3 py-2 text-sm">
                        <span className="text-muted-foreground">Disbursed</span>
                        <span className="font-semibold tabular-nums">
                          {formatPaise(row.actualTotal)}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-lg border p-3">
                    <p className="text-sm font-medium">Collection</p>
                    <dl className="mt-2 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Expected</dt>
                        <dd className="tabular-nums">
                          {formatPaise(row.expectedTotal)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Collected</dt>
                        <dd className="tabular-nums">
                          {formatPaise(row.collectedTotal)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Outstanding</dt>
                        <dd className="tabular-nums">
                          {formatPaise(row.outstandingTotal)}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Target</dt>
                        <dd className="tabular-nums">
                          {formatPaise(row.collectionTarget)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {editing ? (
        <PayoutEditor
          recipient={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {addingTo ? (
        <AddRecipientDialog
          roundId={addingTo.id}
          roundName={addingTo.roundName}
          candidates={candidatesFor(addingTo)}
          onClose={() => setAddingTo(null)}
        />
      ) : null}
    </div>
  );
}
