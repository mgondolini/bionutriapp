import { FormMessage } from "@/components/shared/form-message";
import { goalAmountOf, HabitScale } from "@/components/shared/habit-summary";
import { MetricChart } from "@/components/shared/metric-chart";
import { copy } from "@/lib/copy/it";
import { averageText, measureText } from "@/lib/domain/tracking/labels";
import type {
  CircumferenceOverview,
  MetricOverview,
  WorkoutOverview,
} from "@/lib/domain/tracking/overview";
import type { ScaleRow } from "@/lib/domain/tracking/score-scale";
import {
  formatLongDate,
  formatShortDate,
  formatSignedDelta,
} from "@/lib/format";
import type { MetricLimits } from "@/server/validation/tracking.schema";

import { CircumferenceForm } from "./circumference-form";
import { EntryHistory } from "./entry-history";
import { HabitWeek } from "./habit-detail";
import { WorkoutForm } from "./workout-form";

const t = copy.client.tracking;
const tt = copy.tracking;

/** Stato della scadenza sopra il form (C10). */
function scheduleMessage(item: CircumferenceOverview): string | null {
  const { schedule } = item.summary;
  switch (schedule.status) {
    case "overdue":
      return t.circumference.overdue(
        -schedule.daysLeft!,
        formatLongDate(schedule.dueOn!),
      );
    case "due_soon":
      return t.circumference.dueSoon(formatLongDate(schedule.dueOn!));
    case "never":
      return t.circumference.never;
    case "ok":
      return t.circumference.nextOn(formatLongDate(schedule.dueOn!));
  }
}

function RecordCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby="record-card"
      className="flex flex-col gap-4 rounded-xl border bg-card p-5"
    >
      <h2 id="record-card" className="font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function CircumferenceDetail({
  item,
  limits,
  today,
  canWrite,
}: {
  item: CircumferenceOverview;
  limits: MetricLimits;
  today: string;
  canWrite: boolean;
}) {
  const message = scheduleMessage(item);
  const { summary } = item;
  return (
    <>
      {canWrite ? (
        <RecordCard title={t.circumference.newTitle}>
          {message ? (
            <FormMessage
              tone={summary.schedule.status === "overdue" ? "error" : "info"}
            >
              {message}
            </FormMessage>
          ) : null}
          <CircumferenceForm
            mode={{ kind: "create", metricId: item.metric.id }}
            limits={limits}
            today={today}
            submitLabel={t.circumference.save}
            successMessage={t.circumference.saved}
          />
          {item.metric.instructions ? (
            <p className="text-xs text-muted-foreground">
              {item.metric.instructions}
            </p>
          ) : null}
        </RecordCard>
      ) : null}
      <section className="flex flex-col gap-2 rounded-xl border bg-card p-5">
        {summary.last ? (
          <p className="text-3xl font-bold">
            {measureText(summary.last.value, item.metric.unit)}
          </p>
        ) : null}
        {summary.deltaFromStart !== null && summary.first ? (
          <p className="text-sm text-muted-foreground">
            {t.circumference.fromStart(
              formatSignedDelta(summary.deltaFromStart, item.metric.unit),
              formatShortDate(summary.first.recordedOn),
            )}
          </p>
        ) : null}
        <MetricChart
          variant="line"
          title={t.chartTitle}
          points={item.entries.map((entry) => ({
            day: entry.recordedOn,
            value: entry.value,
          }))}
          unit={item.metric.unit}
          today={today}
        />
      </section>
    </>
  );
}

function WorkoutDetail({
  item,
  limits,
  today,
  canWrite,
}: {
  item: WorkoutOverview;
  limits: MetricLimits;
  today: string;
  canWrite: boolean;
}) {
  const { stats } = item;
  return (
    <>
      {canWrite ? (
        <RecordCard title={t.workout.newTitle}>
          <WorkoutForm
            mode={{ kind: "create", metricId: item.metric.id }}
            limits={limits}
            question={item.metric.instructions ?? item.metric.name}
            today={today}
            submitLabel={t.workout.save}
            successMessage={t.workout.saved}
          />
        </RecordCard>
      ) : null}
      <section
        aria-labelledby="workout-diary"
        className="flex flex-col gap-4 rounded-xl border bg-card p-5"
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2 id="workout-diary" className="font-semibold">
            {t.workout.diaryTitle}
          </h2>
          <span className="text-xs text-muted-foreground">
            {tt.sessions(stats.all.count)}
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <dt className="order-2 text-xs text-muted-foreground">
              {t.workout.averageAll}
            </dt>
            <dd className="text-2xl font-bold">
              {stats.all.average !== null
                ? averageText(stats.all.average)
                : tt.chart.notRecorded}
            </dd>
          </div>
          <div className="flex flex-col">
            <dt className="order-2 text-xs text-muted-foreground">
              {t.workout.weekSessions}
            </dt>
            <dd className="text-2xl font-bold">{stats.week.count}</dd>
          </div>
        </dl>
        <MetricChart
          variant="bars"
          title={t.chartTitle}
          points={item.entries.map((entry) => ({
            day: entry.recordedOn,
            value: entry.value,
          }))}
          max={item.metric.maxValue}
          today={today}
        />
      </section>
    </>
  );
}

/**
 * Dettaglio di una misura nell'area cliente: registrazione (C10, C11) o
 * settimana e scala dei voti (C12), poi lo storico con correzioni (T-03).
 * In sola lettura (In pausa, Concluso) niente form né pulsanti.
 */
export function ClientMetricDetail({
  item,
  limits,
  scale,
  today,
  canWrite,
}: {
  item: MetricOverview;
  limits: MetricLimits;
  scale: ScaleRow[] | null;
  today: string;
  canWrite: boolean;
}) {
  const goalAmount = item.kind === "habit" ? goalAmountOf(item) : null;
  return (
    <div className="flex flex-col gap-6">
      {canWrite ? null : <FormMessage tone="info">{t.readOnly}</FormMessage>}
      {item.kind === "circumference" ? (
        <CircumferenceDetail
          item={item}
          limits={limits}
          today={today}
          canWrite={canWrite}
        />
      ) : item.kind === "workout" ? (
        <WorkoutDetail
          item={item}
          limits={limits}
          today={today}
          canWrite={canWrite}
        />
      ) : (
        <>
          <HabitWeek item={item} today={today} canWrite={canWrite} />
          {scale && goalAmount ? (
            <HabitScale scale={scale} goalAmount={goalAmount} />
          ) : null}
        </>
      )}
      <EntryHistory
        item={item}
        limits={limits}
        today={today}
        canWrite={canWrite}
      />
    </div>
  );
}
