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
        <h2 id="habit-scale" className="text-[17px] font-bold">
          {tt.scale.title}
        </h2>
        <span className="text-[13px] text-muted-foreground">
          {t.scaleGoal(goalAmount)}
        </span>
      </div>
      <dl className="flex flex-col divide-y divide-muted overflow-hidden rounded-[14px] border bg-card">
        {scale.map((row) => (
          <div
            key={row.score}
            className="flex min-h-14 items-center gap-3 px-4 py-2"
          >
            <dt className="flex size-[30px] shrink-0 items-center justify-center rounded-lg bg-primary-tint font-bold text-primary-ink">
              {row.score}
            </dt>
            <dd className="flex flex-1 flex-col">
              <span className="text-sm font-semibold">{row.meaning}</span>
              <span className="text-[12.5px] text-muted-foreground">
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
      className="flex flex-col gap-3.5 rounded-2xl border bg-card p-[18px]"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="habit-week" className="text-[17px] font-bold">
          {t.thisWeek}
        </h2>
        {delta ? (
          <span className="rounded-full bg-primary-tint px-2.5 py-1 text-xs leading-none font-semibold text-primary-ink">
            {delta}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1 rounded-xl bg-background px-3.5 py-3">
          {stats.average !== null ? (
            <p className="text-2xl leading-tight font-bold tracking-tight">
              {averageText(stats.average)}
              <span className="ml-1 text-sm font-medium tracking-normal text-muted-foreground">
                {tt.outOf(item.metric.maxValue)}
              </span>
            </p>
          ) : null}
          <p className="text-[12.5px] text-muted-foreground">
            {stats.average !== null
              ? t.averageOf(
                  weekRangeText(stats.weekFrom, stats.weekTo),
                  tt.filledDays(stats.filledDays),
                )
              : tt.noWeekValues}
          </p>
        </div>
        <div className="flex flex-col gap-1 rounded-xl bg-background px-3.5 py-3">
          {stats.previousAverage !== null ? (
            <p className="text-2xl leading-tight font-bold tracking-tight">
              {averageText(stats.previousAverage)}
            </p>
          ) : null}
          <p className="text-[12.5px] text-muted-foreground">
            {stats.previousAverage !== null
              ? t.previousAverage(tt.filledDays(stats.previousFilledDays))
              : t.noPrevious}
          </p>
        </div>
      </div>
      <MetricChart
        variant="week"
        title={tt.chartTitle}
        days={habitWeekSeries(item.entries, today)}
        max={item.metric.maxValue}
      />
    </section>
  );
}
