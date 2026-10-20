import { MetricChart } from "@/components/shared/metric-chart";
import { copy } from "@/lib/copy/it";
import { habitWeekSeries } from "@/lib/domain/tracking/habits";
import {
  averageText,
  habitDeltaText,
  weekRangeText,
} from "@/lib/domain/tracking/labels";
import type { HabitOverview } from "@/lib/domain/tracking/overview";
import {
  formatGoalAmount,
  type ScaleRow,
} from "@/lib/domain/tracking/score-scale";

const t = copy.tracking.habit;
const tt = copy.tracking;

/** "2,5 L", "8.000 passi": obiettivo effettivo dell'abitudine. */
export function goalAmountOf(item: HabitOverview): string | null {
  return item.goal ? formatGoalAmount(item.goal.value, item.goal.unit) : null;
}

/** Scala dei voti ancorata all'obiettivo (T-07), per cliente (C12) e staff. */
export function HabitScale({
  scale,
  goalAmount,
}: {
  scale: ScaleRow[];
  goalAmount: string;
}) {
  return (
    <section aria-labelledby="habit-scale" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="habit-scale" className="text-sm font-semibold">
          {tt.scale.title}
        </h2>
        <span className="text-xs text-muted-foreground">
          {t.scaleGoal(goalAmount)}
        </span>
      </div>
      <dl className="flex flex-col divide-y rounded-xl border bg-card">
        {scale.map((row) => (
          <div key={row.score} className="flex items-center gap-3 px-4 py-2">
            <dt className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary">
              {row.score}
            </dt>
            <dd className="flex flex-1 flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-sm font-medium">{row.meaning}</span>
              <span className="text-sm text-muted-foreground">
                {row.amount}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * Settimana di un'abitudine (C12, T-08), per cliente e staff: media dei
 * giorni compilati, confronto con la scorsa settimana, grafico delle due settimane.
 */
export function HabitWeekSummary({
  item,
  today,
}: {
  item: HabitOverview;
  today: string;
}) {
  const { stats } = item;
  const delta = habitDeltaText(stats.delta, true);
  return (
    <section
      aria-labelledby="habit-week"
      className="grid gap-4 rounded-xl border bg-card p-5 sm:grid-cols-2"
    >
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 id="habit-week" className="text-sm font-semibold">
            {t.thisWeek}
          </h2>
          {delta ? (
            <span className="text-xs font-medium text-primary">{delta}</span>
          ) : null}
        </div>
        {stats.average !== null ? (
          <p className="text-3xl font-bold">
            {averageText(stats.average)}
            <span className="ml-1 text-base font-normal text-muted-foreground">
              {tt.outOf(item.metric.maxValue)}
            </span>
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {stats.average !== null
            ? t.averageOf(
                weekRangeText(stats.weekFrom, stats.weekTo),
                tt.filledDays(stats.filledDays),
              )
            : tt.noWeekValues}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        {stats.previousAverage !== null ? (
          <p className="text-3xl font-bold text-muted-foreground">
            {averageText(stats.previousAverage)}
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {stats.previousAverage !== null
            ? t.previousAverage(tt.filledDays(stats.previousFilledDays))
            : t.noPrevious}
        </p>
      </div>
      <MetricChart
        variant="week"
        title={tt.chartTitle}
        days={habitWeekSeries(item.entries, today)}
        max={item.metric.maxValue}
        className="sm:col-span-2"
      />
    </section>
  );
}
