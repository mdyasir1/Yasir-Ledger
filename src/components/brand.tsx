import { appConfig } from "@/config/app";
import { cn } from "@/lib/utils";

/**
 * The "Y" monogram.
 *
 * Drawn with type rather than an image so it stays crisp at any size, costs no
 * request and picks up the theme automatically.
 */
export function BrandMark({
  className,
  size = "default",
}: {
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  const sizes = {
    sm: "h-8 w-8 rounded-[0.55rem] text-[0.95rem]",
    default: "h-11 w-11 rounded-[0.8rem] text-xl",
    lg: "h-16 w-16 rounded-[1.15rem] text-3xl",
  } as const;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 select-none items-center justify-center bg-primary font-display font-semibold tracking-[-0.04em] text-primary-foreground shadow-[0_1px_2px_rgb(16_18_27/0.18),0_8px_20px_-10px_rgb(16_18_27/0.5)] ring-1 ring-black/5",
        sizes[size],
        className,
      )}
    >
      Y
    </div>
  );
}

/** The product name and description, used in the splash screen and headers. */
export function BrandLockup({
  size = "default",
  className,
}: {
  size?: "sm" | "default";
  className?: string;
}) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <p
        className={cn(
          "font-display font-semibold tracking-[-0.02em]",
          size === "sm" ? "text-sm" : "text-lg",
        )}
      >
        {appConfig.name}
      </p>
      <p className="text-xs text-muted-foreground">{appConfig.description}</p>
    </div>
  );
}
