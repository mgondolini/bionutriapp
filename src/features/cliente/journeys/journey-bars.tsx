import type { SessionState } from "@/lib/domain/journeys/sessions";
import { cn } from "@/lib/utils";

/**
 * Barrette di avanzamento (C5, C19): una per sessione. Completate piene,
 * prossima vuota con il bordo, le altre chiare; più sottili con 12 o più
 * sessioni. Decorative: lo stesso dato è scritto nel testo accanto.
 */
export function JourneyBars({
  states,
  tone = "card",
}: {
  states: readonly SessionState[];
  /** "mint" sulla card del riepilogo (C19), "card" nella riga della home. */
  tone?: "card" | "mint";
}) {
  const thin = states.length >= 12;
  return (
    <span
      aria-hidden="true"
      className={cn("flex w-full", thin ? "gap-1" : "gap-1.5")}
    >
      {states.map((state, index) => (
        <span
          key={index}
          className={cn(
            "h-2.5 min-w-0 flex-1 rounded-full",
            state === "done" || state === "skipped"
              ? "bg-foreground"
              : state === "next"
                ? "border-2 border-foreground bg-transparent"
                : tone === "mint"
                  ? "bg-card"
                  : "bg-muted",
          )}
        />
      ))}
    </span>
  );
}
