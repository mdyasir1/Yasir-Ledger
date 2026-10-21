import { BrandMark } from "@/components/brand";
import { appConfig } from "@/config/app";
import { cn } from "@/lib/utils";

/**
 * The branded splash screen shown while the session is verified and the first
 * screen loads. Purely presentational — it uses no client-side JavaScript, so it
 * renders on the server and appears immediately.
 */
export function SplashScreen({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex min-h-dvh flex-col items-center justify-center gap-7 bg-background px-6",
        className,
      )}
    >
      <BrandMark size="lg" />

      <div className="space-y-1.5 text-center">
        <p className="text-xl font-semibold tracking-tight">{appConfig.name}</p>
        <p className="text-sm text-muted-foreground">{appConfig.description}</p>
      </div>

      <div
        aria-hidden="true"
        className="h-1 w-40 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full w-1/3 animate-splash rounded-full bg-primary motion-reduce:animate-none" />
      </div>

      <span className="sr-only">Loading</span>
    </div>
  );
}
