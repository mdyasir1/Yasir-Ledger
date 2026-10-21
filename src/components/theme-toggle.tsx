"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "yl-theme";

/**
 * Switches between the light and dark surfaces.
 *
 * The theme lives on the `dark` class of the document element, so the icon is
 * chosen by CSS rather than by React state. That keeps the component free of
 * any hydration mismatch and lets the inline script in the root layout apply
 * the stored theme before the first paint.
 */
export function ThemeToggle() {
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);

    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      // A private browsing session may refuse to store the preference.
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label="Switch between the light and dark theme"
    >
      <Sun
        className="size-4 dark:hidden"
        aria-hidden="true"
      />
      <Moon
        className="hidden size-4 dark:block"
        aria-hidden="true"
      />
    </Button>
  );
}

/** Applies the stored theme before the first paint. */
export const themeScript = `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;
