import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** A single headline figure. */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "default" | "positive" | "warning" | "critical";
  className?: string;
}) {
  const toneStyles = {
    default: "text-foreground",
    positive: "text-emerald-600 dark:text-emerald-400",
    warning: "text-amber-600 dark:text-amber-400",
    critical: "text-red-600 dark:text-red-400",
  } as const;

  return (
    <Card className={cn("shadow-card", className)}>
      <CardContent className="flex items-start justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0 space-y-1.5">
          <p className="eyebrow">{label}</p>
          <p
            className={cn(
              "numeric truncate font-display text-[1.55rem] leading-none font-semibold tracking-[-0.03em] sm:text-[1.7rem]",
              toneStyles[tone],
            )}
          >
            {value}
          </p>
          {hint ? (
            <p className="text-[0.75rem] leading-snug text-muted-foreground">
              {hint}
            </p>
          ) : null}
        </div>
        {Icon ? (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[0.6rem] bg-muted/70 text-muted-foreground">
            <Icon className="size-4" aria-hidden="true" />
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** A row of headline figures. */
export function StatGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
