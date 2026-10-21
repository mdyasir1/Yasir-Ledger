import { cn } from "@/lib/utils";
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from "@/lib/finance/types";

const STATUS_STYLES: Record<PaymentStatus, string> = {
  not_paid:
    "bg-destructive/10 text-destructive ring-destructive/15 dark:text-red-300",
  partially_paid:
    "bg-amber-500/12 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  paid: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  overpaid: "bg-violet-500/12 text-violet-700 ring-violet-500/20 dark:text-violet-300",
  not_applicable: "bg-muted text-muted-foreground ring-border",
};

/** A quiet label for a member's payment status. */
export function StatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[0.6875rem] font-medium whitespace-nowrap ring-1 ring-inset",
        STATUS_STYLES[status],
        className,
      )}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
