import { AlertTriangle, LineChart } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { MetricCard } from "@/components/shared/metric-card";
import { MetricIcon } from "@/components/shared/metric-icon";
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
import type { StaffGoal } from "@/server/services/tracking.service";

import { GoalsDialog } from "./goals-dialog";

const t = copy.admin.clients.tracking;
const tt = copy.tracking;

function BigValue({ value, unit }: { value: string; unit?: string }) {
  return (
    <p className="text-3xl font-bold tabular-nums">
      {value}
      {unit ? (
        <span className="ml-1 text-base font-normal text-muted-foreground">
          {unit}
        </span>
      ) : null}
    </p>
  );
}

function CardFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-auto flex flex-wrap justify-between gap-x-3 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function CircumferenceCard({
  item,
  href,
}: {
  item: CircumferenceOverview;
  href: string;
}) {
  const { summary, metric } = item;
  const { schedule } = summary;
  return (
    <MetricCard
      layout="panel"
      className="w-full"
      kind="circumference"
      icon={metric.icon}
      title={metric.name}
      status={schedule.status}
      href={href}
    >
      {summary.last ? (
        <>
          <div className="flex flex-col gap-1">
            <BigValue
              value={measureText(summary.last.value, null)}
              unit={metric.unit ?? undefined}
            />
            {summary.delta !== null && summary.previous ? (
              <p className="text-sm text-muted-foreground">
                {t.circumference.deltaFrom(
                  formatSignedDelta(summary.delta, metric.unit),
                  formatDayMonthShort(summary.previous.recordedOn),
                )}
              </p>
            ) : null}
          </div>
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
                : t.circumference.nextOn(formatDayMonthShort(schedule.dueOn!))}
            </span>
          </CardFooter>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t.circumference.noEntries}
        </p>
      )}
    </MetricCard>
  );
}

function HabitCard({ item, href }: { item: HabitOverview; href: string }) {
  const { stats, metric, goal } = item;
  const delta = habitDeltaText(stats.delta);
  return (
    <MetricCard
      layout="panel"
      className="w-full"
      kind="habit"
      icon={metric.icon}
      title={metric.name}
      meta={tt.filledDaysOfWeek(stats.filledDays)}
      href={href}
    >
      <div className="flex flex-col gap-1">
        {stats.average !== null ? (
          <BigValue
            value={averageText(stats.average)}
            unit={tt.outOf(metric.maxValue)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">{tt.noWeekValues}</p>
        )}
        {delta ? (
          <p className="text-sm text-muted-foreground">{delta}</p>
        ) : null}
      </div>
      <CardFooter>
        <span>
          {stats.todayValue !== null
            ? t.habit.todayScore(String(stats.todayValue))
            : t.habit.todayMissing}
        </span>
        {goal ? (
          <span>{t.habit.goal(formatGoalAmount(goal.value, goal.unit))}</span>
        ) : null}
      </CardFooter>
    </MetricCard>
  );
}

function WorkoutCard({ item, href }: { item: WorkoutOverview; href: string }) {
  const { stats, metric } = item;
  return (
    <MetricCard
      layout="panel"
      className="w-full"
      kind="workout"
      icon={metric.icon}
      title={metric.name}
      meta={t.workout.thisWeek(tt.sessions(stats.week.count))}
      href={href}
    >
      {stats.last && stats.all.average !== null ? (
        <>
          <div className="flex flex-col gap-1">
            <BigValue
              value={String(stats.last.value)}
              unit={tt.outOf(metric.maxValue)}
            />
            <p className="text-sm text-muted-foreground">
              {t.workout.averageAll(
                averageText(stats.all.average),
                tt.sessions(stats.all.count),
              )}
            </p>
            {stats.last.note ? (
              <blockquote className="mt-1 rounded-lg border-l-4 border-primary/60 bg-muted px-3 py-2 text-sm whitespace-pre-line">
                {stats.last.note}
              </blockquote>
            ) : null}
          </div>
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
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t.workout.noSessions}</p>
      )}
    </MetricCard>
  );
}

function Section({
  kind,
  items,
  clientId,
  today,
}: {
  kind: MetricKind;
  items: MetricOverview[];
  clientId: string;
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
      <div className="flex flex-col gap-0.5">
        <h2 id={id} className="text-base font-semibold">
          {tt.kinds[kind].title}
        </h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => {
          const href = clientTrackingMetricPath(clientId, item.metric.key);
          return (
            <li key={item.metric.id} className="flex">
              {item.kind === "circumference" ? (
                <CircumferenceCard item={item} href={href} />
              ) : item.kind === "habit" ? (
                <HabitCard item={item} href={href} />
              ) : (
                <WorkoutCard item={item} href={href} />
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
      className="flex flex-col gap-4 rounded-xl border bg-card p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex max-w-xl flex-col gap-0.5">
          <h2 id="staff-goals" className="text-base font-semibold">
            {t.goals.title}
          </h2>
          <p className="text-sm text-muted-foreground">{t.goals.description}</p>
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
            className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MetricIcon name={icon} />
            </span>
            <div className="flex flex-col">
              <span className="font-semibold">
                {formatGoalAmount(goal.value, goal.unit)}
              </span>
              <span className="text-xs text-muted-foreground">
                {t.goals.captions[key]}
              </span>
              <span className="text-xs text-muted-foreground">
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
 * Scheda Tracking del cliente (A9, A-12, T-05, T-08): avviso delle
 * circonferenze in ritardo, obiettivi personali e una card per misura.
 * Lo staff consulta soltanto i valori; modifica solo gli obiettivi.
 */
export function TrackingBoard({
  clientId,
  clientName,
  overview,
  goals,
  today,
}: {
  clientId: string;
  clientName: string;
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
          className="flex items-start gap-3 rounded-xl bg-warning px-4 py-3 text-warning-foreground"
        >
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0"
          />
          <p className="text-sm">
            <span className="font-semibold">
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
      {METRIC_KINDS.map((kind) => (
        <Section
          key={kind}
          kind={kind}
          items={overview.filter((item) => item.kind === kind)}
          clientId={clientId}
          today={today}
        />
      ))}
    </div>
  );
}
