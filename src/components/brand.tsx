import { appConfig } from "@/config/app";
import { cn } from "@/lib/utils";

/**
 * The "Y" monogram. Rendered as text rather than an image so it is crisp on every
 * screen density, needs no asset request and inherits the theme colours.
 */
export function BrandMark({
  className,
  size = "default",
}: {
  className?: string;
  size?: "sm" | "default" | "lg";
}) {
  const sizes = {
    sm: "h-9 w-9 rounded-lg text-lg",
    default: "h-12 w-12 rounded-xl text-2xl",
    lg: "h-20 w-20 rounded-2xl text-4xl",
  } as const;

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 select-none items-center justify-center bg-gradient-to-br from-primary to-primary/65 font-semibold tracking-tight text-primary-foreground shadow-md",
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
          "font-semibold tracking-tight",
          size === "sm" ? "text-sm" : "text-lg",
        )}
      >
        {appConfig.name}
      </p>
      <p className="text-xs text-muted-foreground">{appConfig.description}</p>
    </div>
  );
}
