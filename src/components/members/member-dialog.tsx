"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { createMember, updateMember } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { paiseToRupees } from "@/lib/money";
import type { MemberRow } from "@/lib/data/members";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Saving…
        </>
      ) : (
        label
      )}
    </Button>
  );
}

/** The member editor. A new member is created when no member is supplied. */
export function MemberDialog({
  open,
  onOpenChange,
  member,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member?: MemberRow | null;
}) {
  const isNew = !member;

  const [state, formAction] = useActionState(
    async (previous: unknown, formData: FormData) => {
      if (isNew) {
        return createMember({
          fullName: String(formData.get("fullName") ?? ""),
          phoneNumber: String(formData.get("phoneNumber") ?? ""),
          defaultContributionRupees: Number(
            formData.get("defaultContributionRupees") ?? 0,
          ),
        });
      }

      return updateMember({
        memberId: member!.id,
        fullName: String(formData.get("fullName") ?? ""),
        phoneNumber: String(formData.get("phoneNumber") ?? ""),
        defaultContributionRupees: Number(
          formData.get("defaultContributionRupees") ?? 0,
        ),
        isActive: formData.get("isActive") === "on",
        notes: String(formData.get("notes") ?? ""),
      });
    },
    undefined,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success(isNew ? "Member added." : "Member updated.");
      onOpenChange(false);
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, isNew, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add a member" : "Edit member"}</DialogTitle>
          <DialogDescription>
            {isNew
              ? "The new member starts with no obligations in past rounds."
              : "Changing the default does not change past obligations or payments."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-[0.8125rem]">
              Name
            </Label>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={member?.fullName ?? ""}
              required
              maxLength={120}
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="text-[0.8125rem]">
              Phone (optional)
            </Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              defaultValue={member?.phoneNumber ?? ""}
              maxLength={30}
              placeholder="+91 98765 43210"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label
              htmlFor="defaultContributionRupees"
              className="text-[0.8125rem]"
            >
              Default monthly contribution
            </Label>
            <Input
              id="defaultContributionRupees"
              name="defaultContributionRupees"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              defaultValue={
                member
                  ? paiseToRupees(member.defaultContributionAmount)
                  : ""
              }
              required
              className="numeric h-11"
            />
          </div>

          {!isNew ? (
            <div className="flex items-center justify-between rounded-[0.8rem] border border-border/70 px-3.5 py-2.5">
              <Label htmlFor="isActive" className="font-normal">
                Active member
              </Label>
              <Switch
                id="isActive"
                name="isActive"
                defaultChecked={member?.isActive ?? true}
              />
            </div>
          ) : null}

          {!isNew ? (
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-[0.8125rem]">
              Notes (optional)
            </Label>
              <Textarea
                id="notes"
                name="notes"
                rows={2}
                maxLength={500}
                defaultValue={member?.notes ?? ""}
                className="text-[0.875rem]"
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <SubmitButton label={isNew ? "Add member" : "Save changes"} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The button that opens the member editor. */
export function EditMemberButton({
  member,
  onOpen,
}: {
  member: MemberRow;
  onOpen: () => void;
}) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Edit ${member.fullName}`}
      onClick={onOpen}
    >
      <Pencil className="size-4" aria-hidden="true" />
    </Button>
  );
}

/** The button that adds a member. */
export function AddMemberButton({ onOpen }: { onOpen: () => void }) {
  return (
    <Button onClick={onOpen}>
      <Plus className="size-4" aria-hidden="true" />
      Add member
    </Button>
  );
}
