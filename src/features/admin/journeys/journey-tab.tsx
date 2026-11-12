import { Info, Route } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { adminJourneyUrl } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { dateRange } from "@/lib/domain/journeys/labels";
import { daysBetween, todayInRome } from "@/lib/domain/tracking/dates";
import { formatLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  StaffJourneys,
  StaffJourneyView,
} from "@/server/services/journeys.service";

import { DurationCard } from "./duration-card";
import { NewJourneyDialog } from "./new-journey-dialog";
import { SessionSquareContent, sessionSquareClass } from "./session-square";
import { SessionsBoard } from "./sessions-board";

const t = copy.journeys;

function JourneyHistory({
  clientId,
  journeys,
  selectedId,
}: {
  clientId: string;
  journeys: StaffJourneyView[];
  selectedId: string;
}) {
  return (
    <section
      aria-labelledby="journey-history"
      className="flex flex-col gap-4 rounded-[20px] border border-admin-line bg-card p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id="journey-history" className="text-[17px] font-bold">
          {t.admin.historyTitle}
        </h2>
        <p className="text-sm text-admin-muted">{t.admin.historyDescription}</p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {journeys.map((journey) => {
          const selected = journey.id === selectedId;
          return (
            <li key={journey.id}>
              <Link
                href={adminJourneyUrl(clientId, journey.id)}
                aria-current={selected ? "true" : undefined}
                scroll={false}
                className={cn(
                  "grid min-h-14 grid-cols-[auto_1fr_auto] items-center gap-x-6 gap-y-1 rounded-xl border-[1.5px] px-4 py-3 transition-colors hover:bg-admin-row-hover focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:grid-cols-[8rem_9rem_1fr_auto]",
                  selected ? "border-action" : "border-admin-line",
                )}
              >
                <span className="font-bold">
                  {t.journeyNumber(journey.number)}
                </span>
                <span className="text-sm text-admin-muted max-sm:hidden">
                  {t.kind[journey.kind]}
                </span>
                <span className="text-sm">
                  {t.admin.historyRange(
                    t.duration[journey.durationMonths],
                    dateRange(journey.startDate, journey.endDate),
                  )}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold text-foreground",
                    journey.status === "active" ? "bg-mint" : "bg-muted",
                  )}
                >
                  {journey.status === "active"
                    ? t.admin.active
                    : t.admin.concluded}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Percorso concluso (A18): sola lettura e, se è l'ultimo, "Estendi o riprendi". */
function ConcludedJourney({
  journey,
  data,
  canExtend,
  clientName,
}: {
  journey: StaffJourneyView;
  data: StaffJourneys;
  canExtend: boolean;
  clientName: string;
}) {
  const days = journey.concludedOn
    ? Math.max(daysBetween(journey.concludedOn, data.today), 0)
    : 0;
  return (
    <section
      aria-labelledby="journey-concluded"
      className="flex flex-col gap-5 rounded-[20px] border border-admin-line bg-card p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="journey-concluded" className="text-[17px] font-bold">
            {t.journeyHeading(
              journey.number,
              t.duration[journey.durationMonths],
            )}
          </h2>
          <p className="text-sm text-admin-muted">
            {t.admin.concludedHeader(
              formatLongDate(journey.startDate),
              formatLongDate(journey.endDate),
              days,
            )}
          </p>
        </div>
        {canExtend && journey.concludedOn ? (
          <NewJourneyDialog
            clientId={data.client.id}
            clientName={clientName}
            previous={{
              id: journey.id,
              durationMonths: journey.durationMonths,
              concludedOn: journey.concludedOn,
            }}
            clientConcluded={data.client.stage === "completed"}
            today={data.today}
            threshold={data.threshold}
          />
        ) : null}
      </div>
      <ul
        aria-label={t.admin.sessionsGroup}
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
      >
        {journey.sessions.map((session) => (
          <li
            key={session.id}
            className={sessionSquareClass(session.state, false)}
          >
            <SessionSquareContent session={session} today={data.today} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Scheda Percorso (A17–A19): stato vuoto con "Imposta percorso", storico dei
 * percorsi, avviso del ritorno automatico In percorso e il percorso scelto
 * (attivo modificabile, concluso in sola lettura).
 */
export function JourneyTab({
  data,
  selectedId,
  clientName,
}: {
  data: StaffJourneys;
  selectedId: string | undefined;
  clientName: string;
}) {
  const { journeys, client, today } = data;
  if (journeys.length === 0) {
    return (
      <EmptyState
        icon={Route}
        title={t.admin.empty.title}
        description={t.admin.empty.description}
        action={
          <NewJourneyDialog
            clientId={client.id}
            clientName={clientName}
            previous={null}
            clientConcluded={client.stage === "completed"}
            today={today}
            threshold={data.threshold}
          />
        }
      />
    );
  }

  const active = journeys.find((journey) => journey.status === "active");
  const selected =
    journeys.find((journey) => journey.id === selectedId) ??
    active ??
    journeys[0]!;
  const latest = journeys[0]!;
  const previousOfActive = active?.previousJourneyId
    ? journeys.find((journey) => journey.id === active.previousJourneyId)
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      {active && previousOfActive?.concludedOn && active.autoStageChanged ? (
        <p
          role="status"
          className="flex gap-2.5 rounded-xl bg-info px-4 py-3 text-sm text-info-foreground"
        >
          <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {t.admin.autoStageNotice(
            previousOfActive.number,
            formatLongDate(previousOfActive.concludedOn),
            formatLongDate(todayInRome(new Date(active.createdAt))),
            active.number,
            clientName,
          )}
        </p>
      ) : null}
      {journeys.length > 1 ? (
        <JourneyHistory
          clientId={client.id}
          journeys={journeys}
          selectedId={selected.id}
        />
      ) : null}
      {selected.status === "active" ? (
        <>
          <DurationCard
            key={`${selected.id}-${selected.startDate}-${selected.durationMonths}`}
            journey={selected}
          />
          <SessionsBoard
            journey={selected}
            title={
              selected.kind === "first"
                ? t.admin.sessionsTitle
                : t.journeyHeading(selected.number, t.kind[selected.kind])
            }
            description={
              selected.kind === "first"
                ? t.admin.sessionsDescription
                : t.admin.compositionSummary(
                    selected.includeOnboarding,
                    selected.giftMode,
                    selected.sessions.filter((s) => s.type === "check").length +
                      (selected.giftMode === "included" ? 1 : 0),
                  )
            }
            pushEnabled={client.pushEnabled}
            today={today}
          />
          <p className="flex gap-2.5 rounded-xl bg-info px-4 py-3 text-sm text-info-foreground">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {t.admin.recalcNote}
          </p>
        </>
      ) : (
        <ConcludedJourney
          journey={selected}
          data={data}
          canExtend={!active && selected.id === latest.id}
          clientName={clientName}
        />
      )}
    </div>
  );
}
