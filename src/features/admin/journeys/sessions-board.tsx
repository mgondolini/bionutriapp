"use client";

import { useId, useState } from "react";

import { copy } from "@/lib/copy/it";
import type {
  StaffJourneys,
  StaffJourneyView,
  StaffSessionView,
} from "@/server/services/journeys.service";

import { SessionDetail } from "./session-detail";
import { SessionSquareContent, sessionSquareClass } from "./session-square";

const t = copy.journeys;

function initialSelection(sessions: StaffSessionView[]): string | null {
  return (
    sessions.find((session) => session.state === "next")?.id ??
    sessions.find((session) => session.state === "overdue")?.id ??
    sessions[0]?.id ??
    null
  );
}

/**
 * Sessioni del percorso attivo (A17, A19): griglia di quadrati da 6 colonne
 * (pulsanti con `aria-pressed`) e, sotto, il dettaglio della sessione scelta.
 */
export function SessionsBoard({
  journey,
  title,
  description,
  client,
  today,
}: {
  journey: StaffJourneyView;
  title: string;
  description: string;
  client: StaffJourneys["client"];
  today: string;
}) {
  const ids = useId();
  const [selectedId, setSelectedId] = useState(() =>
    initialSelection(journey.sessions),
  );
  const selected =
    journey.sessions.find((session) => session.id === selectedId) ?? null;

  return (
    <section
      aria-labelledby={`${ids}-title`}
      className="flex flex-col gap-5 rounded-[20px] border border-admin-line bg-card p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex max-w-3xl flex-col gap-1">
          <h2 id={`${ids}-title`} className="text-[17px] font-bold">
            {title}
          </h2>
          <p className="text-sm text-admin-muted">{description}</p>
        </div>
        {journey.kind === "first" ? null : (
          <span className="inline-flex min-h-7 items-center rounded-full bg-muted px-3 text-xs font-semibold text-secondary-foreground">
            {t.completedOf(journey.completed, journey.sessions.length)}
          </span>
        )}
      </div>
      <div
        role="group"
        aria-label={t.admin.sessionsGroup}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
      >
        {journey.sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            aria-pressed={session.id === selectedId}
            onClick={() => setSelectedId(session.id)}
            className={`${sessionSquareClass(session.state, session.id === selectedId)} transition-shadow hover:shadow-[0_6px_18px_rgba(31,58,52,.12)] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none`}
          >
            <SessionSquareContent session={session} today={today} />
          </button>
        ))}
      </div>
      {selected ? (
        <SessionDetail
          key={`${selected.id}-${selected.date}-${selected.time}-${selected.status}`}
          session={selected}
          client={client}
        />
      ) : null}
    </section>
  );
}
