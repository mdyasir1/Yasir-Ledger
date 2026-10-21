import { BrandMark } from "@/components/brand";
import { appConfig } from "@/config/app";
import { cn } from "@/lib/utils";

/**
 * The branded splash screen shown while the session is verified and the first
 * screen loads.
 *
 * It uses no client-side JavaScript, so it renders on the server and appears
 * immediately.
 */
export function SplashScreen({ className }: { className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "relative flex min-h-dvh flex-col items-center justify-center gap-8 overflow-hidden bg-background px-6",
        className,
      )}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_38%,color-mix(in_oklch,var(--primary)_9%,transparent),transparent_70%)]"
      />

      <div className="relative flex flex-col items-center gap-6">
        <div className="animate-rise">
          <BrandMark size="lg" />
        </div>

        <div className="animate-rise space-y-1.5 text-center [animation-delay:60ms]">
          <p className="font-display text-[1.6rem] leading-none font-semibold tracking-[-0.03em]">
            {appConfig.name}
          </p>
          <p className="text-[0.8125rem] text-muted-foreground">
            {appConfig.description}
          </p>
        </div>

        <div
          aria-hidden="true"
          className="animate-rise h-[3px] w-36 overflow-hidden rounded-full bg-muted [animation-delay:120ms]"
        >
          <div className="h-full w-1/3 animate-splash rounded-full bg-primary motion-reduce:animate-none" />
        </div>
      </div>

      <span className="sr-only">Loading</span>
    </div>
  );
}
