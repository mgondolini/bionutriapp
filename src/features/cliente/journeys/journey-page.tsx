import {
  Check,
  ChevronRight,
  Minus,
  PhoneCall,
  Route,
  Video,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { clientJourneyUrl } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { eventEnd, sessionMinutes } from "@/lib/domain/journeys/calendar";
import { PhotoMark } from "@/components/shared/photos/photo-mark";
import { dateRange, sessionLabel } from "@/lib/domain/journeys/labels";
import { groupClosedSessions } from "@/lib/domain/journeys/sessions";
import { formatLongDate, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  ClientJourneys,
  ClientJourneyView,
  ClientSessionView,
} from "@/server/services/journeys.service";

import { CalendarSheet } from "./calendar-sheet";
import { JourneyBars } from "./journey-bars";

const t = copy.journeys;

function Summary({ journey }: { journey: ClientJourneyView }) {
  const month = t.month(journey.month.current, journey.month.total);
  return (
    <section
      aria-label={t.client.title}
      className="flex flex-col gap-3.5 rounded-[18px] bg-mint px-5 py-4 text-mint-foreground"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[22px] leading-tight font-bold">
          {journey.number > 1
            ? t.client.journeyMonth(journey.number, month)
            : month}
        </p>
        <p className="pt-1 text-right text-xs">
          {t.client.completedSummary(
            journey.completed,
            journey.sessions.length,
          )}
        </p>
      </div>
      <JourneyBars
        tone="mint"
        states={journey.sessions.map((session) => session.state)}
      />
      <div className="flex justify-between gap-3 text-[13px]">
        <span>
          {t.client.start} <b>{formatShortDate(journey.startDate)}</b>
        </span>
        <span>
          {t.client.end} <b>{formatShortDate(journey.endDate)}</b>
        </span>
      </div>
    </section>
  );
}

/** Icona a sinistra: spunta, tratto (saltata), numero del check o telefono. */
function SessionMarker({ session }: { session: ClientSessionView }) {
  if (session.state === "done") {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check aria-hidden="true" className="size-4" />
      </span>
    );
  }
  if (session.state === "skipped") {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Minus aria-hidden="true" className="size-4" />
      </span>
    );
  }
  if (session.state === "next") {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-tint">
        <span className="size-2 rounded-full bg-card" />
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-bold text-white"
    >
      {session.name.kind === "check" ? (
        session.name.number
      ) : (
        <PhoneCall className="size-4" />
      )}
    </span>
  );
}

function SessionRow({
  session,
  isLast,
  readOnly,
  studioName,
}: {
  session: ClientSessionView;
  isLast: boolean;
  readOnly: boolean;
  studioName: string;
}) {
  const next = session.state === "next";
  const details = [
    formatLongDate(session.date),
    session.time
      ? t.timeRange(
          session.time,
          eventEnd(session.date, session.time, sessionMinutes(session.type))
            .time,
        )
      : null,
    // il link arriva solo per il prossimo check
    session.meetingUrl ? t.meet : null,
    isLast && session.name.kind === "check" ? t.client.lastCheck : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const badge =
    session.state === "next"
      ? t.state.next
      : session.state === "overdue"
        ? t.state.overdue
        : session.state === "skipped"
          ? t.client.sessionSkipped
          : null;
  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-[14px] bg-card px-4 py-3.5",
        next ? "border-2 border-primary" : "border",
      )}
    >
      <div className="flex items-center gap-3">
        <SessionMarker session={session} />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
            {sessionLabel(session.name)}
            {session.photo && session.photo !== "skipped" ? (
              <PhotoMark state={session.photo} />
            ) : null}
          </span>
          <span className="text-[13px] text-muted-foreground">{details}</span>
        </div>
        {badge ? (
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-xs font-bold text-foreground",
              session.state === "skipped" ? "bg-muted" : "bg-warm",
            )}
          >
            {badge}
          </span>
        ) : session.state === "done" ? (
          <span className="sr-only">{t.client.sessionDone}</span>
        ) : null}
      </div>
      {next && !readOnly ? (
        <div className="flex flex-col gap-2">
          {session.meetingUrl ? (
            <a
              href={session.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants(), "w-full")}
            >
              <Video aria-hidden="true" />
              {t.client.joinMeet}
            </a>
          ) : null}
          <CalendarSheet session={session} studioName={studioName} />
        </div>
      ) : null}
    </li>
  );
}

function GroupedRow({ sessions }: { sessions: ClientSessionView[] }) {
  const first = sessions[0]!;
  const last = sessions.at(-1)!;
  const checks = sessions.flatMap((session) =>
    session.name.kind === "check" ? [session.name.number] : [],
  );
  const checkText =
    checks.length > 0
      ? t.client.checkRange(Math.min(...checks), Math.max(...checks))
      : null;
  const hasOnboarding = sessions.some(
    (session) => session.name.kind === "onboarding",
  );
  const name =
    hasOnboarding && checkText
      ? t.client.groupedName(t.sessionName.onboarding, checkText)
      : (checkText ?? t.sessionName.onboarding);
  return (
    <li className="flex items-center gap-3 rounded-[14px] border bg-card px-4 py-3.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Check aria-hidden="true" className="size-4" />
      </span>
      <div className="flex min-w-0 flex-col">
        <span className="text-[15px] font-bold">{name}</span>
        <span className="text-[13px] text-muted-foreground">
          {dateRange(first.date, last.date, "long")}
        </span>
      </div>
    </li>
  );
}

/**
 * Pagina Percorso (C19, C20): riepilogo, sessioni (le chiuse più vecchie in
 * una riga), "Aggiungi al calendario" sul prossimo check e, dal secondo
 * percorso, i percorsi precedenti. Sola lettura: le date le gestisce lo studio.
 */
export function JourneyPage({
  data,
  studioName,
}: {
  data: ClientJourneys;
  studioName: string;
}) {
  const { shown, previous, isCurrent } = data;
  if (!shown) {
    return (
      <EmptyState
        icon={Route}
        title={t.client.empty.title}
        description={t.client.empty.description}
      />
    );
  }
  const { grouped, rest } = groupClosedSessions(shown.sessions);
  const lastId = shown.sessions.at(-1)?.id;
  const readOnly = shown.status !== "active";

  return (
    <div className="flex flex-col gap-5">
      {isCurrent ? null : (
        <p className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-info px-4 py-3 text-sm text-info-foreground">
          {t.client.viewingPrevious}
          <Link
            href={clientJourneyUrl()}
            className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4"
          >
            {t.client.backToCurrent}
          </Link>
        </p>
      )}
      <Summary journey={shown} />
      <section
        aria-labelledby="journey-sessions"
        className="flex flex-col gap-2.5"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="journey-sessions" className="text-lg font-bold">
            {t.client.sessionsTitle}
          </h2>
          <span className="text-[13px] text-muted-foreground">
            {t.client.sessionsCount(shown.completed, shown.sessions.length)}
          </span>
        </div>
        <ol className="flex flex-col gap-2.5">
          {grouped.length > 0 ? <GroupedRow sessions={grouped} /> : null}
          {rest.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              isLast={session.id === lastId}
              readOnly={readOnly}
              studioName={studioName}
            />
          ))}
        </ol>
        <p className="text-[13px] text-muted-foreground">
          {t.client.managedNote}
        </p>
      </section>
      {previous.length > 0 ? (
        <section
          aria-labelledby="journey-previous"
          className="flex flex-col gap-2.5"
        >
          <h2 id="journey-previous" className="text-lg font-bold">
            {t.client.previousTitle}
          </h2>
          <ul className="flex flex-col gap-2.5">
            {previous.map((journey) => (
              <li key={journey.id}>
                <Link
                  href={clientJourneyUrl(journey.id)}
                  className="flex min-h-11 items-center gap-3 rounded-[14px] border bg-card px-4 py-3.5 transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint">
                    <Check aria-hidden="true" className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[15px] font-bold">
                      {t.journeyNumber(journey.number)}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {t.client.previousRange(
                        dateRange(journey.startDate, journey.endDate, "long"),
                        t.duration[journey.durationMonths],
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-bold">
                    {t.admin.concluded}
                  </span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-5 shrink-0"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
