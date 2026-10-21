"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildCallUrl,
  buildReminderMessage,
  buildWhatsAppUrl,
} from "@/lib/finance/reminder";
import { formatPaise } from "@/lib/money";
import type { MemberPosition } from "@/lib/finance/types";

/**
 * The reminder composer.
 *
 * The message is generated from the values actually recorded in the database and
 * can be edited before it is sent. Nothing is ever sent automatically.
 */
export function ReminderDialog({
  open,
  onOpenChange,
  fullName,
  roundName,
  position,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fullName: string;
  roundName: string;
  position: MemberPosition;
}) {
  const generated = buildReminderMessage({
    fullName,
    roundName,
    position,
  });
  const [message, setMessage] = useState(generated);
  const [copied, setCopied] = useState(false);

  // Keep the generated message in sync when the dialog is opened.
  const [lastKey, setLastKey] = useState("");
  const key = `${fullName}-${roundName}-${position.status}-${position.paidAmount}`;
  if (open && key !== lastKey) {
    setLastKey(key);
    setMessage(generated);
    setCopied(false);
  }

  const whatsappUrl = position.phoneNumber
    ? buildWhatsAppUrl(position.phoneNumber, message)
    : null;
  const callUrl = position.phoneNumber
    ? buildCallUrl(position.phoneNumber)
    : null;

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      toast.success("Reminder copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the reminder.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send a reminder</DialogTitle>
          <DialogDescription>
            {fullName} · {roundName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted px-3 py-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Expected</dt>
              <dd className="font-semibold tabular-nums">
                {formatPaise(position.expectedAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Paid</dt>
              <dd className="font-semibold tabular-nums">
                {formatPaise(position.paidAmount)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Outstanding</dt>
              <dd className="font-semibold tabular-nums">
                {formatPaise(position.outstanding)}
              </dd>
            </div>
          </dl>

          <div className="space-y-2">
            <Label htmlFor="reminder-message">Message</Label>
            <Textarea
              id="reminder-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              Edit the message if you want to change the wording. Nothing is sent
              automatically.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2">
          {callUrl ? (
            <Button variant="outline" render={<a href={callUrl} />}>
              <Phone className="size-4" aria-hidden="true" />
              Call
            </Button>
          ) : null}

          {whatsappUrl ? (
            <Button
              variant="outline"
              render={
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" />
              }
            >
              <MessageCircle className="size-4" aria-hidden="true" />
              WhatsApp
            </Button>
          ) : null}

          <Button variant="outline" onClick={copyMessage}>
            {copied ? (
              <Check className="size-4" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
