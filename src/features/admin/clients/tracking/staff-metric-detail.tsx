import {
  goalAmountOf,
  HabitScale,
  HabitWeekSummary,
} from "@/components/shared/habit-summary";
import { MetricChart } from "@/components/shared/metric-chart";
import { EntryHistory } from "@/components/shared/tracking/entry-history";
import { copy } from "@/lib/copy/it";
import { averageText, measureText } from "@/lib/domain/tracking/labels";
import type {
  CircumferenceOverview,
  MetricOverview,
  WorkoutOverview,
} from "@/lib/domain/tracking/overview";
import type { EntryViewer } from "@/lib/domain/tracking/permissions";
import type { ScaleRow } from "@/lib/domain/tracking/score-scale";
import { formatLongDate, formatSignedDelta } from "@/lib/format";
import { metricLimits } from "@/server/validation/tracking.schema";

import { AddEntryDialog } from "./add-entry-dialog";

const t = copy.admin.clients.tracking.detail;
const tt = copy.tracking;
const NONE = tt.chart.notRecorded;

function Stat({
  label,
  value,
  unit,
  hint,
}: {
  label: string;
  value: string;
  unit?: string | null;
  hint?: string | null;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card p-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="flex flex-col gap-0.5">
        <span className="text-2xl font-bold tabular-nums">
          {value}
          {unit ? (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {unit}
            </span>
          ) : null}
        </span>
        {hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </dd>
    </div>
  );
}

function CircumferenceDetail({
  item,
  today,
}: {
  item: CircumferenceOverview;
  today: string;
}) {
  const { summary, metric } = item;
  const { schedule } = summary;
  const unit = metric.unit;
  return (
    <>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t.lastValue}
          value={summary.last ? measureText(summary.last.value, null) : NONE}
          unit={summary.last ? unit : null}
          hint={summary.last ? formatLongDate(summary.last.recordedOn) : null}
        />
        <Stat
          label={t.fromPrevious}
          value={
            summary.delta !== null ? formatSignedDelta(summary.delta) : NONE
          }
          unit={summary.delta !== null ? unit : null}
          hint={
            summary.previous
              ? t.fromPreviousHint(
                  measureText(summary.previous.value, unit),
                  formatLongDate(summary.previous.recordedOn),
                )
              : null
          }
        />
        <Stat
          label={t.fromStart}
          value={
            summary.deltaFromStart !== null
              ? formatSignedDelta(summary.deltaFromStart)
              : NONE
          }
          unit={summary.deltaFromStart !== null ? unit : null}
          hint={
            summary.first
              ? t.fromPreviousHint(
                  measureText(summary.first.value, unit),
                  formatLongDate(summary.first.recordedOn),
                )
              : null
          }
        />
        <Stat
          label={t.next}
          value={
            schedule.status === "never"
              ? t.neverRecorded
              : schedule.status === "overdue"
                ? t.expired
                : formatLongDate(schedule.dueOn!)
          }
          hint={
            schedule.status === "overdue"
              ? t.expectedOn(
                  formatLongDate(schedule.dueOn!),
                  -schedule.daysLeft!,
                )
              : null
          }
        />
      </dl>
      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <MetricChart
          variant="line"
          title={tt.chartTitle}
          points={item.entries.map((entry) => ({
            day: entry.recordedOn,
            value: entry.value,
          }))}
          unit={unit}
          today={today}
        />
      </section>
    </>
  );
}

function WorkoutDetail({
  item,
  today,
}: {
  item: WorkoutOverview;
  today: string;
}) {
  const { stats, metric } = item;
  const max = metric.maxValue;
  const average = (value: number | null) =>
    value === null ? null : t.averageLine(averageText(value));
  return (
    <>
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label={t.workoutAverage}
          value={
            stats.all.average !== null ? averageText(stats.all.average) : NONE
          }
          unit={tt.outOf(max)}
          hint={t.workoutAverageOf(tt.sessions(stats.all.count))}
        />
        <Stat
          label={t.lastWorkout}
          value={stats.last ? String(stats.last.value) : NONE}
          unit={tt.outOf(max)}
          hint={stats.last ? formatLongDate(stats.last.recordedOn) : null}
        />
        <Stat
          label={t.week}
          value={String(stats.week.count)}
          unit={t.sessionsUnit(stats.week.count)}
          hint={average(stats.week.average)}
        />
        <Stat
          label={t.recent}
          value={String(stats.recent.count)}
          unit={t.sessionsUnit(stats.recent.count)}
          hint={average(stats.recent.average)}
        />
      </dl>
      <section className="rounded-xl border bg-card p-4 sm:p-5">
        <MetricChart
          variant="bars"
          title={tt.chartTitle}
          points={item.entries.map((entry) => ({
            day: entry.recordedOn,
            value: entry.value,
          }))}
          max={max}
          today={today}
        />
      </section>
    </>
  );
}

/**
 * Dettaglio di una misura per lo staff: circonferenze (A10) con andamento,
 * allenamenti (A11) con voto medio, abitudini con la settimana e la scala dei
 * voti; poi lo storico condiviso con l'area cliente, dove lo staff corregge
 * ed elimina qualsiasi registrazione (A-15) e vede l'autore (A-16).
 */
export function StaffMetricDetail({
  item,
  scale,
  today,
  clientId,
  clientName,
  viewer,
}: {
  item: MetricOverview;
  scale: ScaleRow[] | null;
  today: string;
  clientId: string;
  clientName: string;
  viewer: EntryViewer;
}) {
  const goalAmount = item.kind === "habit" ? goalAmountOf(item) : null;
  return (
    <>
      <AddEntryDialog
        item={item}
        clientId={clientId}
        clientName={clientName}
        today={today}
        className="w-full sm:w-auto sm:self-start"
      />
      {item.kind === "circumference" ? (
        <CircumferenceDetail item={item} today={today} />
      ) : item.kind === "workout" ? (
        <WorkoutDetail item={item} today={today} />
      ) : (
        <>
          <HabitWeekSummary item={item} today={today} />
          {scale && goalAmount ? (
            <HabitScale scale={scale} goalAmount={goalAmount} />
          ) : null}
        </>
      )}
      <EntryHistory
        item={item}
        limits={metricLimits(item.metric)}
        today={today}
        viewer={viewer}
        clientId={clientId}
      />
    </>
  );
}
