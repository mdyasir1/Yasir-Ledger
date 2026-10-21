"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/app/(app)/actions";
import { BrandMark } from "@/components/brand";
import { OfflineBanner } from "@/components/offline-banner";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/config/app";
import { isActivePath, navigation } from "@/config/navigation";
import { cn } from "@/lib/utils";

/**
 * The authenticated application shell.
 *
 * Desktop gets a fixed sidebar. Mobile gets a compact bottom navigation bar.
 * The current monthly round selector lives in the header and is added once the
 * round data layer exists.
 */
export function AppShell({
  children,
  adminEmail,
}: {
  children: React.ReactNode;
  adminEmail: string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <OfflineBanner />

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card/40 lg:flex">
        <div className="flex h-16 items-center gap-3 border-b px-5">
          <BrandMark size="sm" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold leading-tight">{appConfig.name}</p>
            <p className="text-[11px] leading-tight text-muted-foreground">
              {appConfig.schemeName} scheme
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {navigation.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-3">
          <div className="mb-2 truncate px-3 text-xs text-muted-foreground">
            {adminEmail}
          </div>
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-3 text-muted-foreground"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2.5">
          <BrandMark size="sm" />
          <p className="text-sm font-semibold">{appConfig.name}</p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="ghost" size="icon" aria-label="Sign out">
            <LogOut className="size-4" aria-hidden="true" />
          </Button>
        </form>
      </header>

      <div className="flex flex-1 flex-col lg:pl-60">
        <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-10">
          {children}
        </main>

        <footer className="hidden border-t px-6 py-4 text-xs text-muted-foreground lg:block">
          {appConfig.name} · {appConfig.schemeName} contribution scheme ·{" "}
          {appConfig.ownerCredit}
        </footer>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {navigation.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {item.shortLabel}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
