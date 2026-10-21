import { cn } from "@/lib/utils";
import { PAYMENT_STATUS_LABELS, type PaymentStatus } from "@/lib/finance/types";

const STATUS_STYLES: Record<PaymentStatus, string> = {
  not_paid: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  partially_paid:
    "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  overpaid:
    "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  not_applicable:
    "bg-muted text-muted-foreground dark:bg-muted/40",
};

/** A coloured label for a member's payment status. */
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
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_STYLES[status],
        className,
      )}
    >
      {PAYMENT_STATUS_LABELS[status]}
    </span>
  );
}
