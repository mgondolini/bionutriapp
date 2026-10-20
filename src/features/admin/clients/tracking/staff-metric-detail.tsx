import {
  goalAmountOf,
  HabitScale,
  HabitWeekSummary,
} from "@/components/shared/habit-summary";
import { MetricChart } from "@/components/shared/metric-chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HISTORY_LIMIT } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { measureHistory } from "@/lib/domain/tracking/circumferences";
import {
  averageText,
  measureText,
  scoreText,
} from "@/lib/domain/tracking/labels";
import type {
  CircumferenceOverview,
  MetricOverview,
  WorkoutOverview,
} from "@/lib/domain/tracking/overview";
import type { ScaleRow } from "@/lib/domain/tracking/score-scale";
import {
  formatLongDate,
  formatSignedDelta,
  formatWeekdayShort,
} from "@/lib/format";

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

function HistoryTable({
  title,
  columns,
  rows,
  total,
}: {
  title: string;
  columns: string[];
  rows: { id: string; cells: string[] }[];
  total: number;
}) {
  return (
    <section aria-labelledby="staff-history" className="flex flex-col gap-3">
      <h2 id="staff-history" className="text-base font-semibold">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tt.noEntries}</p>
      ) : (
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  {row.cells.map((cell, index) => (
                    <TableCell
                      key={index}
                      className={
                        index === row.cells.length - 1
                          ? "whitespace-normal"
                          : undefined
                      }
                    >
                      {cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      {total > HISTORY_LIMIT ? (
        <p className="text-xs text-muted-foreground">
          {t.limited(HISTORY_LIMIT)}
        </p>
      ) : null}
    </section>
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
  const history = measureHistory(item.entries).slice(0, HISTORY_LIMIT);
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
      <section className="rounded-xl border bg-card p-5">
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
      <HistoryTable
        title={t.historyTitle}
        columns={[t.columns.date, t.columns.value, t.columns.delta]}
        rows={history.map((row) => ({
          id: row.id,
          cells: [
            formatLongDate(row.recordedOn),
            measureText(row.value, unit),
            row.delta === null
              ? t.initialValue
              : formatSignedDelta(row.delta, unit),
          ],
        }))}
        total={item.entries.length}
      />
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
      <section className="rounded-xl border bg-card p-5">
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
      <HistoryTable
        title={t.diaryTitle}
        columns={[t.columns.date, t.columns.score, t.columns.note]}
        rows={item.entries.slice(0, HISTORY_LIMIT).map((entry) => ({
          id: entry.id,
          cells: [
            formatLongDate(entry.recordedOn),
            scoreText(entry.value, max),
            entry.note ?? tt.chart.notRecorded,
          ],
        }))}
        total={item.entries.length}
      />
    </>
  );
}

/**
 * Dettaglio di una misura per lo staff, in sola consultazione: circonferenze
 * (A10) con andamento e storico, allenamenti (A11) con voto medio e diario,
 * abitudini con la settimana, la scala dei voti e i giorni compilati.
 */
export function StaffMetricDetail({
  item,
  scale,
  today,
}: {
  item: MetricOverview;
  scale: ScaleRow[] | null;
  today: string;
}) {
  if (item.kind === "circumference") {
    return <CircumferenceDetail item={item} today={today} />;
  }
  if (item.kind === "workout") {
    return <WorkoutDetail item={item} today={today} />;
  }
  const goalAmount = goalAmountOf(item);
  return (
    <>
      <HabitWeekSummary item={item} today={today} />
      {scale && goalAmount ? (
        <HabitScale scale={scale} goalAmount={goalAmount} />
      ) : null}
      <HistoryTable
        title={t.daysTitle}
        columns={[t.columns.date, t.columns.score]}
        rows={item.entries.slice(0, HISTORY_LIMIT).map((entry) => ({
          id: entry.id,
          cells: [
            `${formatWeekdayShort(entry.recordedOn)} ${formatLongDate(entry.recordedOn)}`,
            scoreText(entry.value, item.metric.maxValue),
          ],
        }))}
        total={item.entries.length}
      />
    </>
  );
}
