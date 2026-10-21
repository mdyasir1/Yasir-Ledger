"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { CalendarRange } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type RoundOption = {
  id: string;
  roundName: string;
};

/**
 * The monthly round selector.
 *
 * The selected round is kept in the URL so that every screen shows the same
 * month, the choice survives a refresh, and a screen can be linked to directly.
 */
export function RoundSelector({
  rounds,
  selectedId,
  searchParams = {},
  className,
}: {
  rounds: RoundOption[];
  selectedId: string;
  searchParams?: Record<string, string | undefined>;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (rounds.length === 0) return null;

  // Base UI renders the raw value, so the label is supplied explicitly.
  const selectedLabel =
    rounds.find((round) => round.id === selectedId)?.roundName ?? "Select a month";

  function handleChange(value: string | null) {
    if (!value) return;

    const params = new URLSearchParams();
    for (const [key, entry] of Object.entries(searchParams)) {
      if (key !== "round" && entry) params.set(key, entry);
    }
    params.set("round", value);

    const query = params.toString();
    startTransition(() => {
      router.push(query ? `?${query}` : "?", { scroll: false });
    });
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <CalendarRange
        className="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <Select value={selectedId} onValueChange={handleChange} disabled={isPending}>
        <SelectTrigger
          className="h-9 w-full min-w-40"
          aria-label="Select the monthly round"
        >
          <SelectValue>{selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {rounds.map((round) => (
            <SelectItem key={round.id} value={round.id}>
              {round.roundName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
