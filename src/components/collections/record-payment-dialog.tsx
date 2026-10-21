"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { recordPaymentForm } from "@/app/actions/payments";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toLocalInputValue } from "@/lib/datetime";
import { formatPaise, paiseToRupees } from "@/lib/money";

const PAYMENT_METHODS = [
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
] as const;


function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" size="lg" disabled={pending || disabled}>
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          Saving
        </>
      ) : (
        "Record payment"
      )}
    </Button>
  );
}

/**
 * The payment recording form.
 *
 * The amount is prefilled with the member's full outstanding balance, so the
 * common case is a single tap. The resulting balance is shown before saving.
 *
 * The idempotency key is created by the parent when the form is opened and is
 * reused for every retry, so a double tap or a retried request can never
 * record the same money twice.
 */
export function RecordPaymentDialog({
  open,
  onOpenChange,
  roundId,
  roundName,
  memberId,
  memberName,
  outstandingAmount,
  expectedAmount,
  paidAmount,
  idempotencyKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roundId: string;
  roundName: string;
  memberId: string;
  memberName: string;
  outstandingAmount: number;
  expectedAmount: number;
  paidAmount: number;
  idempotencyKey: string;
}) {
  const [amount, setAmount] = useState(() =>
    outstandingAmount > 0 ? String(paiseToRupees(outstandingAmount)) : "",
  );
  const [method, setMethod] = useState("upi");
  const [receivedAt, setReceivedAt] = useState(() =>
    toLocalInputValue(new Date()),
  );
  const [isOnline, setIsOnline] = useState(true);

  const [state, formAction] = useActionState(recordPaymentForm, undefined);

  // Track connectivity so the form can refuse to submit while offline.
  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  useEffect(() => {
    if (state?.ok) {
      toast.success(`Payment recorded for ${memberName}.`);
      onOpenChange(false);
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state, memberName, onOpenChange]);

  const amountNumber = Number(amount);
  const amountIsValid = Number.isFinite(amountNumber) && amountNumber > 0;
  const resultingBalance = amountIsValid
    ? Math.max(0, expectedAmount - paidAmount - Math.round(amountNumber * 100))
    : expectedAmount - paidAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record a payment</DialogTitle>
          <DialogDescription>
            {memberName} · {roundName}
          </DialogDescription>
        </DialogHeader>

        {!isOnline ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-[0.7rem] bg-amber-500/10 px-3.5 py-2.5 text-[0.8125rem] leading-relaxed text-amber-800 ring-1 ring-amber-500/20 dark:text-amber-200"
          >
            <WifiOff className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              You are offline. A payment cannot be saved right now, and
              nothing will be recorded. Please reconnect and try again.
            </span>
          </div>
        ) : null}

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="roundId" value={roundId} />
          <input type="hidden" name="memberId" value={memberId} />
          <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

          <div className="space-y-2">
            <Label htmlFor="amountRupees" className="text-[0.8125rem]">
              Amount received
            </Label>
            <div className="flex gap-2">
              <Input
                id="amountRupees"
                name="amountRupees"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                required
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="numeric h-11 text-[0.95rem] font-medium"
              />
              {outstandingAmount > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0"
                  onClick={() =>
                    setAmount(String(paiseToRupees(outstandingAmount)))
                  }
                >
                  Full
                </Button>
              ) : null}
            </div>
            <p className="numeric text-[0.75rem] text-muted-foreground">
              Outstanding {formatPaise(outstandingAmount)} · Expected{" "}
              {formatPaise(expectedAmount)}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="paymentMethod" className="text-[0.8125rem]">
                Paid by
              </Label>
              <Select
                name="paymentMethod"
                value={method}
                onValueChange={(value) => {
                  if (value) setMethod(value);
                }}
              >
                <SelectTrigger id="paymentMethod" className="h-11 w-full">
                  <SelectValue>
                    {PAYMENT_METHODS.find((entry) => entry.value === method)
                      ?.label ?? "UPI"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((entry) => (
                    <SelectItem key={entry.value} value={entry.value}>
                      {entry.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receivedAt" className="text-[0.8125rem]">
                Received on
              </Label>
              <Input
                id="receivedAt"
                name="receivedAt"
                type="datetime-local"
                required
                value={receivedAt}
                onChange={(event) => setReceivedAt(event.target.value)}
                className="h-11"
              />
            </div>
          </div>

          <p className="text-[0.6875rem] text-muted-foreground">
            The date and time are read as Asia/Kolkata time. Enter the moment
            the money actually arrived.
          </p>

          <div className="space-y-2">
            <Label htmlFor="transactionReference" className="text-[0.8125rem]">
              Reference (optional)
            </Label>
            <Input
              id="transactionReference"
              name="transactionReference"
              type="text"
              maxLength={120}
              placeholder="UPI or transaction number"
              className="h-10"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note" className="text-[0.8125rem]">
              Note (optional)
            </Label>
            <Textarea id="note" name="note" rows={2} maxLength={500} />
          </div>

          <div className="flex items-center justify-between rounded-[0.8rem] bg-muted/60 px-4 py-3">
            <span className="text-[0.8125rem] text-muted-foreground">
              Balance after this payment
            </span>
            <span className="numeric font-display text-lg font-semibold tracking-[-0.02em]">
              {formatPaise(resultingBalance)}
            </span>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <SubmitButton disabled={!amountIsValid || !isOnline} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
