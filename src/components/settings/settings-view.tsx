"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { updateRound } from "@/app/actions/rounds";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { appConfig } from "@/config/app";
import { paiseToRupees, formatPaise } from "@/lib/money";
import type { RoundRow } from "@/lib/data/rounds";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Saving…
        </>
      ) : (
        "Save"
      )}
    </Button>
  );
}

function RoundDialog({
  round,
  onClose,
}: {
  round: RoundRow;
  onClose: () => void;
}) {
  const [state, formAction] = useActionState(
    async (_previous: unknown, formData: FormData) =>
      updateRound({
        roundId: round.id,
        collectionTargetRupees: Number(
          formData.get("collectionTargetRupees") ?? 0,
        ),
        status: String(
          formData.get("status") ?? "open",
        ) as "open" | "closed",
        notes: String(formData.get("notes") ?? ""),
      }),
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success("Month updated.");
      onClose();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, onClose]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {round.roundName}</DialogTitle>
          <DialogDescription>
            The target is a reference. Expected collection is always the sum of
            the obligations configured for the month.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="collectionTargetRupees">Collection target</Label>
            <Input
              id="collectionTargetRupees"
              name="collectionTargetRupees"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              defaultValue={paiseToRupees(round.collectionTarget)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select name="status" defaultValue={round.status}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue>
                  {round.status === "closed" ? "Closed" : "Open"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={2}
              maxLength={500}
              defaultValue={round.notes ?? ""}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The Settings screen. */
export function SettingsView({
  rounds,
  memberCount,
  totalExpected,
}: {
  rounds: RoundRow[];
  memberCount: number;
  totalExpected: number;
}) {
  const [editing, setEditing] = useState<RoundRow | null>(null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Scheme configuration and the monthly rounds."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Scheme</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Application</dt>
                <dd className="font-medium">{appConfig.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Purpose</dt>
                <dd className="font-medium">{appConfig.description}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Period</dt>
                <dd className="font-medium">
                  {rounds[0]?.roundName ?? "—"} –{" "}
                  {rounds[rounds.length - 1]?.roundName ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Rounds</dt>
                <dd className="font-medium">{rounds.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Members</dt>
                <dd className="font-medium">{memberCount}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Monthly target</dt>
                <dd className="font-medium tabular-nums">
                  {formatPaise(rounds[0]?.collectionTarget ?? 0)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Expected across scheme</dt>
                <dd className="font-medium tabular-nums">
                  {formatPaise(totalExpected)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Currency</dt>
                <dd className="font-medium">
                  {appConfig.currency} · {appConfig.locale} · {appConfig.timeZone}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              {appConfig.name} is a private contribution-tracking application
              for a cheeti scheme, {appConfig.ownerCredit.toLowerCase()}.
            </p>
            <p>
              Payments are recorded manually after you confirm them, for example
              from a bank notification. Nothing is sent to a member
              automatically, and no bank credentials are ever requested or
              stored.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly rounds</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {rounds.map((round) => (
              <li
                key={round.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="font-medium">{round.roundName}</p>
                  <p className="text-xs text-muted-foreground">
                    Target {formatPaise(round.collectionTarget)} ·{" "}
                    {round.recipientCount} recipient
                    {round.recipientCount === 1 ? "" : "s"} ·{" "}
                    {formatPaise(round.actualPayoutTotal)} disbursed
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={round.status === "open" ? "secondary" : "outline"}>
                    {round.status === "open" ? "Open" : "Closed"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${round.roundName}`}
                    onClick={() => setEditing(round)}
                  >
                    <Settings2 className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {editing ? (
        <RoundDialog round={editing} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
}
