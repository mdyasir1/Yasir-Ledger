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

  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {percent.toFixed(0)}% of the expected amount collected
      </p>
    </div>
  );
}
