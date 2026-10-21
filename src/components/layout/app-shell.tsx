"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { logout } from "@/app/(app)/actions";
import { BrandMark } from "@/components/brand";
import { OfflineBanner } from "@/components/offline-banner";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/config/app";
import { isActivePath, navigation } from "@/config/navigation";
import { cn } from "@/lib/utils";

/**
 * The authenticated application shell.
 *
 * Desktop gets a fixed sidebar. Mobile gets a compact bottom navigation bar.
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[15.5rem] flex-col border-r border-border/70 bg-sidebar lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-border/70 px-5">
          <BrandMark size="sm" />
          <div className="space-y-px">
            <p className="font-display text-sm leading-tight font-semibold tracking-[-0.015em]">
              {appConfig.name}
            </p>
            <p className="text-[0.6875rem] leading-tight text-muted-foreground">
              {appConfig.schemeName} scheme
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 p-3">
          {navigation.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-[0.7rem] px-3 py-2 text-[0.8125rem] font-medium transition-colors duration-150",
                  active
                    ? "bg-primary/8 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-1/2 left-0 h-4 w-[2.5px] -translate-y-1/2 rounded-full bg-primary transition-opacity duration-150",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                <Icon
                  className={cn(
                    "size-[1.05rem] shrink-0 transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground/80 group-hover:text-foreground",
                  )}
                  aria-hidden="true"
                />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border/70 p-3">
          <div className="mb-2 flex items-center justify-between gap-2 px-3">
            <span className="truncate text-[0.6875rem] text-muted-foreground">
              {adminEmail}
            </span>
            <ThemeToggle />
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
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-border/70 bg-background/85 px-4 backdrop-blur-md lg:hidden">
        <div className="flex items-center gap-2.5">
          <BrandMark size="sm" />
          <p className="font-display text-sm font-semibold tracking-[-0.015em]">
            {appConfig.name}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <form action={logout}>
            <Button type="submit" variant="ghost" size="icon-sm" aria-label="Sign out">
              <LogOut className="size-4" aria-hidden="true" />
            </Button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:pl-[15.5rem]">
        <main className="flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-9 lg:pb-12 lg:pt-7">
          {children}
        </main>

        <footer className="hidden border-t border-border/70 px-9 py-5 text-[0.6875rem] text-muted-foreground lg:block">
          {appConfig.name} · {appConfig.schemeName} contribution scheme ·{" "}
          {appConfig.ownerCredit}
        </footer>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-border/70 bg-background/88 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
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
                "flex min-h-14 flex-col items-center justify-center gap-1 px-0.5 text-[0.625rem] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="size-[1.15rem]" aria-hidden="true" />
              <span className="truncate">{item.shortLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
