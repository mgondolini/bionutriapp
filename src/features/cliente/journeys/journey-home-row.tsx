import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { JOURNEY_CLIENT_PATH } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatDayMonthLong } from "@/lib/format";
import type { ClientJourneyView } from "@/server/services/journeys.service";

import { JourneyBars } from "./journey-bars";

const t = copy.journeys;

/**
 * Riga compatta "Il tuo percorso" della home (C5), sopra il file in
 * evidenza: mese, barrette delle sessioni e prossimo check. Porta a C19.
 */
export function JourneyHomeRow({ journey }: { journey: ClientJourneyView }) {
  const month = t.month(journey.month.current, journey.month.total);
  const next = journey.next ? formatDayMonthLong(journey.next.date) : null;
  return (
    <Link
      href={JOURNEY_CLIENT_PATH}
      aria-label={t.client.homeAria(month, next)}
      className="flex min-h-11 items-center gap-3 rounded-[18px] border bg-card px-4 py-3.5 transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex items-baseline justify-between gap-2">
          <span className="text-[15px] font-bold">{t.client.title}</span>
          <span className="text-xs text-muted-foreground">{month}</span>
        </span>
        <JourneyBars
          states={journey.sessions.map((session) => session.state)}
        />
        {next ? (
          <span className="text-[13px]">
            {t.client.nextCheck} <b>{next}</b>
          </span>
        ) : null}
      </span>
      <ChevronRight aria-hidden="true" className="size-5 shrink-0" />
    </Link>
  );
}
