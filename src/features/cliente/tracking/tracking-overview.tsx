import { ChevronDown, Clock, LineChart } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { FormMessage } from "@/components/shared/form-message";
import {
  MetricCard,
  MetricRowList,
  RecordedTick,
} from "@/components/shared/metric-card";
import { MetricIcon } from "@/components/shared/metric-icon";
import { buttonVariants } from "@/components/ui/button";
import {
  checkinUrl,
  trackingMetricPath,
  type MetricKind,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import {
  averageText,
  relativeDayText,
  scoreText,
} from "@/lib/domain/tracking/labels";
import {
  checkinStatus,
  circumferenceProgress,
  type CircumferenceOverview,
  type HabitOverview,
  type MetricOverview,
  type WorkoutOverview,
} from "@/lib/domain/tracking/overview";
import {
  formatDayMonthLong,
  formatDayMonthShort,
  formatSignedDelta,
  formatWeekdayShort,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const t = copy.client.tracking;
const tt = copy.tracking;

/** Ancora del dettaglio allenamenti: apre direttamente il form di registrazione. */
const RECORD_ANCHOR = "#record-card";
const CIRCUMFERENCE_SECTION_ID = "tracking-circumference";
/** Oltre questo numero di misure mancanti si scrive il conteggio, non i nomi. */
const MAX_MISSING_NAMES = 3;

function SectionHeader({
  id,
  title,
  hint,
}: {
  id: string;
  title: string;
  hint: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h2 id={id} className="text-[17px] font-bold">
        {title}
      </h2>
      <span className="text-[13px] text-muted-foreground">{hint}</span>
    </div>
  );
}

/** Pannello della card "Oggi": stato e una sola azione. */
function TodayPanel({
  title,
  status,
  done,
  doneLabel,
  action,
}: {
  title: string;
  status: string;
  done: boolean;
  doneLabel: string;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-white/60 p-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="text-[15px] font-bold">{title}</h3>
          <p className="text-[13.5px] leading-snug">{status}</p>
        </div>
        {done ? <RecordedTick label={doneLabel} /> : null}
      </div>
      {/* in fondo al pannello: affiancati, i due pulsanti restano allineati */}
      {action ? <div className="mt-auto">{action}</div> : null}
    </div>
  );
}

function workoutToday(item: WorkoutOverview, today: string) {
  const last = item.stats.last;
  return last && last.recordedOn === today ? last : null;
}

/**
 * Card "Oggi" (C8): le due cose da fare ogni giorno, check-in e allenamento,
 * con lo stesso peso. Un secondo allenamento nello stesso giorno è sempre
 * possibile ("Aggiungi un altro").
 */
function TodayCard({
  overview,
  workout,
  today,
  canWrite,
}: {
  overview: MetricOverview[];
  workout: WorkoutOverview | null;
  today: string;
  canWrite: boolean;
}) {
  const { habits, missing } = checkinStatus(overview);
  if (habits.length === 0 && !workout) return null;
  const checkinDone = missing.length === 0;
  const lastToday = workout ? workoutToday(workout, today) : null;
  const action = (href: string, label: string, primary: boolean) =>
    canWrite ? (
      <Link
        href={href}
        className={buttonVariants({
          variant: primary ? "default" : "mint-outline",
          className: "h-12 w-full rounded-xl",
        })}
      >
        {label}
      </Link>
    ) : null;

  return (
    <section
      aria-labelledby="today-card"
      className="flex flex-col gap-3 rounded-[18px] bg-mint p-5 text-mint-foreground"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="today-card"
          className="text-[19px] leading-tight font-bold tracking-tight"
        >
          {t.today.title}
        </h2>
        <p className="shrink-0 text-[12.5px] font-semibold">
          {t.checkinCard.date(
            formatWeekdayShort(today),
            formatDayMonthLong(today),
          )}
        </p>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {habits.length > 0 ? (
          <TodayPanel
            title={t.today.checkinTitle}
            status={`${t.checkinCard.description} ${t.checkinCard.missing(
              missing.length,
              habits.length,
            )}`}
            done={checkinDone}
            doneLabel={t.today.checkinDoneAria}
            action={action(
              checkinUrl(),
              checkinDone ? t.checkinCard.ctaEdit : t.checkinCard.cta,
              !checkinDone,
            )}
          />
        ) : null}
        {workout ? (
          <TodayPanel
            title={t.today.workoutTitle}
            status={
              lastToday
                ? t.today.workoutDone(
                    scoreText(lastToday.value, workout.metric.maxValue),
                  )
                : t.today.workoutNone
            }
            done={lastToday !== null}
            doneLabel={t.workouts.doneAria}
            action={action(
              `${trackingMetricPath(workout.metric.key)}${RECORD_ANCHOR}`,
              lastToday ? t.today.workoutAnother : t.today.workoutCta,
              lastToday === null,
            )}
          />
        ) : null}
      </div>
    </section>
  );
}

/**
 * Allenamenti (C8): quanti in questa settimana e l'ultimo con la data
 * relativa; "Registra" sta accanto alla riga, che resta un link al dettaglio.
 */
function WorkoutSection({
  item,
  today,
  canWrite,
}: {
  item: WorkoutOverview;
  today: string;
  canWrite: boolean;
}) {
  const id = "tracking-workout";
  const last = item.stats.last;
  const href = trackingMetricPath(item.metric.key);
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <SectionHeader
        id={id}
        title={tt.kinds.workout.title}
        hint={tt.kinds.workout.hint}
      />
      <MetricRowList>
        <li className="flex items-center bg-card">
          <MetricCard
            layout="row"
            kind="workout"
            icon={item.metric.icon}
            title={t.workouts.week(item.stats.week.count)}
            meta={
              last
                ? t.workouts.last(
                    relativeDayText(last.recordedOn, today),
                    scoreText(last.value, item.metric.maxValue),
                  )
                : t.workouts.none
            }
            recorded={item.recordedInPeriod}
            showPending
            tickLabels={{
              recorded: t.workouts.doneAria,
              pending: t.workouts.pendingAria,
            }}
            href={href}
            className="min-w-0 flex-1"
          />
          {canWrite ? (
            <Link
              href={`${href}${RECORD_ANCHOR}`}
              aria-label={t.workouts.registerAria}
              className={buttonVariants({
                variant: "outline",
                size: "sm",
                className: "mr-4 shrink-0",
              })}
            >
              {t.workouts.register}
            </Link>
          ) : null}
        </li>
      </MetricRowList>
    </section>
  );
}

/** Promemoria compatto delle misure in ritardo (T-05); niente se non ce ne sono. */
function OverdueNotice({
  overdue,
  canWrite,
}: {
  overdue: CircumferenceOverview[];
  canWrite: boolean;
}) {
  if (overdue.length === 0) return null;
  const href =
    overdue.length === 1
      ? trackingMetricPath(overdue[0]!.metric.key)
      : `#${CIRCUMFERENCE_SECTION_ID}`;
  return (
    <p className="flex min-h-11 items-center gap-3 rounded-xl bg-warning px-4 py-2 text-sm text-warning-foreground">
      <Clock aria-hidden="true" className="size-4 shrink-0" />
      <span className="flex-1 font-semibold">
        {t.overdue.text(overdue.length)}
      </span>
      {canWrite ? (
        <Link
          href={href}
          className="inline-flex min-h-11 items-center font-bold underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {t.overdue.cta}
        </Link>
      ) : null}
    </p>
  );
}

/** " · +0,6", con la sola differenza in evidenza (nessun colore: T-08). */
function WeekDelta({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  if (delta === 0) return <>{` · ${tt.deltaZero}`}</>;
  return (
    <>
      {" · "}
      <span className="font-semibold text-foreground">
        {formatSignedDelta(delta)}
      </span>
    </>
  );
}

function habitMeta(item: HabitOverview) {
  const { stats, metric } = item;
  return (
    <>
      <span className="block">
        {stats.todayValue !== null
          ? tt.todayScore(scoreText(stats.todayValue, metric.maxValue))
          : tt.todayMissing}
      </span>
      <span className="block font-normal text-muted-foreground">
        {stats.average !== null ? (
          <>
            {t.habits.average(averageText(stats.average))}
            <WeekDelta delta={stats.delta} />
          </>
        ) : (
          tt.noWeekValues
        )}
      </span>
    </>
  );
}

/** Abitudini (C8): stato di oggi e media della settimana nella stessa riga. */
function HabitSection({ items }: { items: HabitOverview[] }) {
  if (items.length === 0) return null;
  const id = "tracking-habit";
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <SectionHeader
        id={id}
        title={tt.kinds.habit.title}
        hint={tt.kinds.habit.hint}
      />
      <MetricRowList>
        {items.map((item) => (
          <li key={item.metric.id}>
            <MetricCard
              layout="row"
              kind="habit"
              icon={item.metric.icon}
              title={item.metric.name}
              description={item.metric.instructions}
              meta={habitMeta(item)}
              recorded={item.recordedInPeriod}
              href={trackingMetricPath(item.metric.key)}
            />
          </li>
        ))}
      </MetricRowList>
    </section>
  );
}

function missingText(missing: CircumferenceOverview[]): string {
  if (missing.length > MAX_MISSING_NAMES) {
    return t.circumferences.missingMany(missing.length);
  }
  const names = new Intl.ListFormat("it", { type: "conjunction" }).format(
    missing.map((item) => item.metric.name),
  );
  return t.circumferences.missing(names);
}

/**
 * Peso e circonferenze (C8), in fondo: una riga riassuntiva e l'elenco
 * completo a un tocco. Aperto in partenza se manca qualcosa. `<details>`:
 * nessun JavaScript, la pagina resta un Server Component.
 */
function CircumferenceSection({ items }: { items: CircumferenceOverview[] }) {
  if (items.length === 0) return null;
  const progress = circumferenceProgress(items);
  const complete = progress.missing.length === 0;
  return (
    <section
      id={CIRCUMFERENCE_SECTION_ID}
      aria-labelledby="tracking-circumference-title"
      className="flex scroll-mt-4 flex-col gap-2.5"
    >
      <SectionHeader
        id="tracking-circumference-title"
        title={tt.kinds.circumference.title}
        hint={t.circumferences.hint}
      />
      <details
        open={!complete}
        className="group overflow-hidden rounded-[14px] border bg-card"
      >
        <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl text-secondary-foreground",
              complete ? "bg-primary-tint" : "bg-warning",
            )}
          >
            <MetricIcon name={items[0]!.metric.icon} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[15px] font-semibold">
              {t.circumferences.progress(progress.recorded, progress.total)}
            </span>
            {complete ? null : (
              <span className="text-[12.5px] font-semibold">
                {missingText(progress.missing)}
              </span>
            )}
          </span>
          {complete ? <RecordedTick /> : null}
          <span className="flex shrink-0 items-center gap-1 text-[13px] font-semibold text-primary-ink">
            <span className="group-open:hidden">
              {t.circumferences.showAll}
            </span>
            <span className="hidden group-open:inline">
              {t.circumferences.hideAll}
            </span>
            <ChevronDown
              aria-hidden="true"
              className="size-4 transition-transform group-open:rotate-180"
            />
          </span>
        </summary>
        <ul className="flex flex-col divide-y divide-muted border-t">
          {items.map((item) => (
            <li key={item.metric.id}>
              <MetricCard
                layout="row"
                kind="circumference"
                icon={item.metric.icon}
                title={item.metric.name}
                meta={circumferenceMeta(item)}
                status={item.summary.schedule.status}
                recorded={item.recordedInPeriod}
                href={trackingMetricPath(item.metric.key)}
              />
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

/** "6 registrazioni · ultima 8 set" */
function circumferenceMeta(item: CircumferenceOverview): string {
  const count = tt.entries(item.entries.length);
  const last = item.entries[0];
  return last
    ? `${count} · ${tt.lastOn(formatDayMonthShort(last.recordedOn))}`
    : count;
}

function ofKind<K extends MetricKind>(
  overview: MetricOverview[],
  kind: K,
): Extract<MetricOverview, { kind: K }>[] {
  return overview.filter(
    (item): item is Extract<MetricOverview, { kind: K }> => item.kind === kind,
  );
}

/**
 * Pagina Tracking (C8, T-01), in ordine di frequenza: oggi (check-in e
 * allenamento), allenamenti, eventuali ritardi, abitudini, poi le misure
 * mensili. L'ordine vale solo qui: METRIC_KINDS resta quello della scheda dello staff.
 */
export function TrackingOverview({
  overview,
  today,
  canWrite,
}: {
  overview: MetricOverview[];
  today: string;
  canWrite: boolean;
}) {
  if (overview.length === 0) {
    return (
      <EmptyState
        icon={LineChart}
        title={copy.client.sections.tracking.emptyTitle}
        description={copy.client.sections.tracking.emptyDescription}
      />
    );
  }
  const workout = ofKind(overview, "workout")[0] ?? null;
  const circumferences = ofKind(overview, "circumference");
  return (
    <div className="flex flex-col gap-5">
      {canWrite ? null : <FormMessage tone="info">{t.readOnly}</FormMessage>}
      <TodayCard
        overview={overview}
        workout={workout}
        today={today}
        canWrite={canWrite}
      />
      {workout ? (
        <WorkoutSection item={workout} today={today} canWrite={canWrite} />
      ) : null}
      <OverdueNotice
        overdue={circumferenceProgress(circumferences).overdue}
        canWrite={canWrite}
      />
      <HabitSection items={ofKind(overview, "habit")} />
      <CircumferenceSection items={circumferences} />
    </div>
  );
}
