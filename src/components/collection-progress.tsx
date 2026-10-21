import { cn } from "@/lib/utils";

/** A thin collection progress bar. */
export function CollectionProgress({
  value,
  className,
}: {
  /** A ratio between 0 and 1. */
  value: number;
  className?: string;
}) {
  const percent = Math.max(0, Math.min(1, value)) * 100;
  const complete = percent >= 99.5;

  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-500",
            complete
              ? "bg-emerald-500"
              : "bg-primary",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-2 text-[0.75rem] text-muted-foreground">
        <span className="numeric font-medium text-foreground">
          {percent.toFixed(0)}%
        </span>{" "}
        of the expected amount collected
      </p>
    </div>
  );
}
