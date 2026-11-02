import { Clock, LineChart } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { MetricCard } from "@/components/shared/metric-card";
import { MetricIcon } from "@/components/shared/metric-icon";
import { MiniBars, Sparkline } from "@/components/shared/tracking/sparkline";
import {
  METRIC_KINDS,
  clientTrackingMetricPath,
  type MetricKind,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { addDays, weekStart } from "@/lib/domain/tracking/dates";
import {
  averageText,
  habitDeltaText,
  measureText,
  weekRangeText,
} from "@/lib/domain/tracking/labels";
import type {
  CircumferenceOverview,
  HabitOverview,
  MetricOverview,
  WorkoutOverview,
} from "@/lib/domain/tracking/overview";
import { formatGoalAmount } from "@/lib/domain/tracking/score-scale";
import { formatDayMonthShort, formatSignedDelta } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StaffGoal } from "@/server/services/tracking.service";

import { AddEntryDialog } from "./add-entry-dialog";
import { GoalsDialog } from "./goals-dialog";
import { HeightPill } from "./height-pill";

const t = copy.admin.clients.tracking;

/** Gli allenamenti stanno nella griglia delle abitudini, come nel mockup A9. */
const SECTION_KINDS = METRIC_KINDS.filter((kind) => kind !== "workout");
const sectionOf = (kind: MetricKind): MetricKind =>
  kind === "workout" ? "habit" : kind;
const tt = copy.tracking;

/** Giorni mostrati nelle barre delle abitudini e sessioni in quelle degli allenamenti. */
const HABIT_BAR_DAYS = 12;
const WORKOUT_BARS = 6;
const SPARKLINE_POINTS = 6;

function BigValue({ value, unit }: { value: string; unit?: string }) {
  return (
    <p className="text-[28px] leading-none font-bold tracking-tight tabular-nums">
      {value}
      {unit ? (
        <span className="ml-1 text-[13px] font-medium tracking-normal text-muted-foreground">
          {unit}
        </span>
      ) : null}
    </p>
  );
}

function CardFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-muted pt-2.5 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

/**
 * Righe della card dopo l'intestazione: valore, grafico, nota, piè di pagina
 * e pulsante. Ogni card ha sempre tutte le righe (vuote se mancano) e le
 * allinea con quelle delle altre card della stessa fila (`subgrid`, vedi
 * `PANEL_GRID`): grafici e pulsanti stanno alla stessa altezza anche se una
 * card non ha la variazione, la nota o il voto.
 */
function PanelRows({
  value,
  chart,
  note,
  footer,
  action,
}: {
  value: React.ReactNode;
  chart?: React.ReactNode;
  note?: React.ReactNode;
  footer?: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <>
      <div className="flex flex-col gap-1.5">{value}</div>
      <div className="self-end">{chart}</div>
      <div>{note}</div>
      <div className="self-end">{footer}</div>
      {action}
    </>
  );
}

/** Intestazione + le cinque righe di `PanelRows`. */
const PANEL_GRID = "row-span-6 grid grid-rows-subgrid";

/** Voti degli ultimi giorni fino a oggi, dal più vecchio; `null` per i giorni saltati. */
function habitBars(
  entries: readonly { recordedOn: string; value: number }[],
  today: string,
): (number | null)[] {
  const byDay = new Map(
    entries.map((entry) => [entry.recordedOn, entry.value]),
  );
  return Array.from(
    { length: HABIT_BAR_DAYS },
    (_, index) => byDay.get(addDays(today, index - HABIT_BAR_DAYS + 1)) ?? null,
  );
}

type CardProps<T> = {
  item: T;
  href: string;
  today: string;
  /** "Aggiungi registrazione" (A-15), in fondo alla card. */
  action: React.ReactNode;
};

function CircumferenceCard({
  item,
  href,
  action,
}: CardProps<CircumferenceOverview>) {
  const { summary, metric, entries } = item;
  const trend = entries
    .slice(0, SPARKLINE_POINTS)
    .map((entry) => entry.value)
    .reverse();
  const { schedule } = summary;
  return (
    <MetricCard
      layout="panel"
      className={cn("w-full", PANEL_GRID)}
      kind="circumference"
      icon={metric.icon}
      title={metric.name}
      status={schedule.status}
      href={href}
    >
      <PanelRows
        value={
          summary.last ? (
            <>
              <BigValue
                value={measureText(summary.last.value, null)}
                unit={metric.unit ?? undefined}
              />
              {summary.delta !== null && summary.previous ? (
                <p className="text-[13px] text-muted-foreground">
                  <b className="font-bold text-foreground">
                    {formatSignedDelta(summary.delta, metric.unit)}
                  </b>{" "}
                  {t.circumference.since(
                    formatDayMonthShort(summary.previous.recordedOn),
                  )}
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t.circumference.noEntries}
            </p>
          )
        }
        chart={<Sparkline values={trend} />}
        footer={
          summary.last ? (
            <CardFooter>
              <span>
                {t.circumference.lastOn(
                  formatDayMonthShort(summary.last.recordedOn),
                )}
              </span>
              <span>
                {schedule.status === "overdue"
                  ? t.circumference.expired(
                      formatDayMonthShort(schedule.dueOn!),
                      -schedule.daysLeft!,
                    )
                  : t.circumference.nextOn(
                      formatDayMonthShort(schedule.dueOn!),
                    )}
              </span>
            </CardFooter>
          ) : null
        }
        action={action}
      />
    </MetricCard>
  );
}

function HabitCard({ item, href, action, today }: CardProps<HabitOverview>) {
  const { stats, metric, goal, entries } = item;
  const delta = habitDeltaText(stats.delta);
  return (
    <MetricCard
      layout="panel"
      className={cn("w-full", PANEL_GRID)}
      kind="habit"
      icon={metric.icon}
      title={metric.name}
      meta={tt.filledDaysOfWeek(stats.filledDays)}
      href={href}
    >
      <PanelRows
        value={
          <>
            {stats.average !== null ? (
              <BigValue
                value={averageText(stats.average)}
                unit={tt.outOf(metric.maxValue)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{tt.noWeekValues}</p>
            )}
            {delta ? (
              <p className="text-[13px] text-muted-foreground">{delta}</p>
            ) : null}
          </>
        }
        chart={
          <MiniBars values={habitBars(entries, today)} max={metric.maxValue} />
        }
        footer={
          <CardFooter>
            <span>
              {stats.todayValue !== null
                ? t.habit.todayScore(String(stats.todayValue))
                : t.habit.todayMissing}
            </span>
            {goal ? (
              <span>
                {t.habit.goal(formatGoalAmount(goal.value, goal.unit))}
              </span>
            ) : null}
          </CardFooter>
        }
        action={action}
      />
    </MetricCard>
  );
}

function WorkoutCard({ item, href, action }: CardProps<WorkoutOverview>) {
  const { stats, metric, entries } = item;
  const sessions = entries
    .slice(0, WORKOUT_BARS)
    .map((entry) => entry.value)
    .reverse();
  return (
    <MetricCard
      layout="panel"
      className={cn("w-full", PANEL_GRID)}
      kind="workout"
      icon={metric.icon}
      title={metric.name}
      meta={t.workout.thisWeek(tt.sessions(stats.week.count))}
      href={href}
    >
      <PanelRows
        value={
          stats.last && stats.all.average !== null ? (
            <>
              <BigValue
                value={String(stats.last.value)}
                unit={tt.outOf(metric.maxValue)}
              />
              <p className="text-[13px] text-muted-foreground">
                {t.workout.averageAll(
                  averageText(stats.all.average),
                  tt.sessions(stats.all.count),
                )}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t.workout.noSessions}
            </p>
          )
        }
        chart={<MiniBars values={sessions} max={metric.maxValue} />}
        note={
          stats.last?.note ? (
            <blockquote className="border-l-2 border-line-strong pl-3 text-[13px] whitespace-pre-line text-muted-foreground">
              {stats.last.note}
            </blockquote>
          ) : null
        }
        footer={
          stats.last ? (
            <CardFooter>
              <span>
                {t.workout.lastOn(formatDayMonthShort(stats.last.recordedOn))}
              </span>
              {stats.recent.average !== null ? (
                <span>
                  {t.workout.recentAverage(averageText(stats.recent.average))}
                </span>
              ) : null}
            </CardFooter>
          ) : null
        }
        action={action}
      />
    </MetricCard>
  );
}

function Section({
  kind,
  items,
  clientId,
  clientName,
  heightCm,
  today,
}: {
  kind: MetricKind;
  items: MetricOverview[];
  clientId: string;
  clientName: string;
  heightCm: number | null;
  today: string;
}) {
  if (items.length === 0) return null;
  const id = `staff-tracking-${kind}`;
  const monday = weekStart(today);
  const subtitle =
    kind === "habit"
      ? t.sections.habit(weekRangeText(monday, addDays(monday, 6)))
      : t.sections[kind];
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h2 id={id} className="text-lg font-bold">
            {tt.kinds[kind].title}
          </h2>
          {kind === "circumference" ? (
            <HeightPill clientId={clientId} heightCm={heightCm} />
          ) : null}
        </div>
        <p className="text-[13px] text-muted-foreground">{subtitle}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const href = clientTrackingMetricPath(clientId, item.metric.key);
          const action = (
            <AddEntryDialog
              item={item}
              clientId={clientId}
              clientName={clientName}
              today={today}
              compact
              className="w-full"
            />
          );
          return (
            <li key={item.metric.id} className={cn("min-w-0", PANEL_GRID)}>
              {item.kind === "circumference" ? (
                <CircumferenceCard
                  item={item}
                  href={href}
                  action={action}
                  today={today}
                />
              ) : item.kind === "habit" ? (
                <HabitCard
                  item={item}
                  href={href}
                  action={action}
                  today={today}
                />
              ) : (
                <WorkoutCard
                  item={item}
                  href={href}
                  action={action}
                  today={today}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function GoalsSection({
  clientId,
  clientName,
  goals,
}: {
  clientId: string;
  clientName: string;
  goals: StaffGoal[];
}) {
  if (goals.length === 0) return null;
  return (
    <section
      aria-labelledby="staff-goals"
      className="flex flex-col gap-4 rounded-[14px] border bg-card p-5 sm:px-6 sm:py-[22px]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex max-w-2xl flex-col gap-0.5">
          <h2 id="staff-goals" className="text-[17px] font-bold">
            {t.goals.title}
          </h2>
          <p className="text-[13px] text-muted-foreground">
            {t.goals.description}
          </p>
        </div>
        <GoalsDialog
          clientId={clientId}
          clientName={clientName}
          goals={goals}
        />
      </div>
      <ul className="grid gap-3 sm:grid-cols-3">
        {goals.map(({ key, icon, goal }) => (
          <li
            key={key}
            className="flex items-center gap-3 rounded-xl bg-background px-3.5 py-3"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-card text-primary-ink">
              <MetricIcon name={icon} />
            </span>
            <div className="flex flex-col">
              <span className="text-base font-bold">
                {formatGoalAmount(goal.value, goal.unit)}
              </span>
              <span className="text-[12.5px] text-muted-foreground">
                {t.goals.captions[key]} ·{" "}
                {goal.personal ? t.goals.personal : t.goals.studioDefault}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Scheda Tracking del cliente (A9, A-12, A-15, A-17, T-05, T-08): avviso
 * delle circonferenze in ritardo, obiettivi personali e una card per misura,
 * su una colonna sotto `sm`; ogni card ha "Aggiungi registrazione".
 */
export function TrackingBoard({
  clientId,
  clientName,
  heightCm,
  overview,
  goals,
  today,
}: {
  clientId: string;
  clientName: string;
  heightCm: number | null;
  overview: MetricOverview[];
  goals: StaffGoal[];
  today: string;
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
  const overdue = overview.filter(
    (item) =>
      item.kind === "circumference" &&
      item.summary.schedule.status === "overdue",
  );
  return (
    <div className="flex flex-col gap-6">
      {overdue.length > 0 ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl bg-warning px-4 py-3.5 text-warning-foreground"
        >
          <Clock aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p className="text-sm">
            <span className="font-bold">
              {t.overdue(
                overdue.length,
                overdue.map((item) => item.metric.name).join(", "),
              )}
            </span>{" "}
            {t.overdueHint}
          </p>
        </div>
      ) : null}
      <GoalsSection clientId={clientId} clientName={clientName} goals={goals} />
      {SECTION_KINDS.map((kind) => (
        <Section
          key={kind}
          kind={kind}
          items={overview.filter((item) => sectionOf(item.kind) === kind)}
          clientId={clientId}
          clientName={clientName}
          heightCm={heightCm}
          today={today}
        />
      ))}
    </div>
  );
}
