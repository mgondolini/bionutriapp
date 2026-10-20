"use client";

import { useId, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { copy } from "@/lib/copy/it";
import { addDays } from "@/lib/domain/tracking/dates";
import type { HabitWeekDay } from "@/lib/domain/tracking/habits";
import {
  formatDayMonthShort,
  formatDecimal,
  formatLongDate,
  formatWeekdayLong,
  formatWeekdayShort,
} from "@/lib/format";
import { cn } from "@/lib/utils";

const t = copy.tracking.chart;

/** Oltre questo numero di punti le etichette dei valori si sovrapporrebbero. */
const MAX_LABELS = 12;

const RANGES = {
  months6: 183,
  months12: 365,
  all: null,
} as const;
type Range = keyof typeof RANGES;

export type ChartPoint = { day: string; value: number };

type ChartProps = {
  /** Titolo visibile, anche nome accessibile del grafico. */
  title: string;
  className?: string;
} & (
  | {
      /** Andamento nel tempo (circonferenze, A10, C10). */
      variant: "line";
      points: ChartPoint[];
      unit: string | null;
      today: string;
      decimals?: number;
    }
  | {
      /** Voti delle sessioni (allenamenti, A11, C11). */
      variant: "bars";
      points: ChartPoint[];
      max: number;
      today: string;
    }
  | {
      /** Questa settimana e la scorsa, giorno per giorno (abitudini, C12). */
      variant: "week";
      days: HabitWeekDay[];
      max: number;
    }
);

const lineConfig = {
  value: { label: t.value, color: "var(--primary)" },
} satisfies ChartConfig;

const weekConfig = {
  previous: { label: t.previousWeek, color: "var(--muted-foreground)" },
  current: { label: t.currentWeek, color: "var(--primary)" },
} satisfies ChartConfig;

function RangePicker({
  value,
  onChange,
}: {
  value: Range;
  onChange: (range: Range) => void;
}) {
  return (
    <div
      role="group"
      aria-label={t.rangeLabel}
      className="flex gap-1 rounded-lg bg-muted p-1"
    >
      {(Object.keys(RANGES) as Range[]).map((range) => (
        <button
          key={range}
          type="button"
          aria-pressed={value === range}
          onClick={() => onChange(range)}
          className={cn(
            "h-9 rounded-md px-3 text-xs font-medium transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
            value === range
              ? "bg-background shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.ranges[range]}
        </button>
      ))}
    </div>
  );
}

function inRange(points: ChartPoint[], range: Range, today: string) {
  const days = RANGES[range];
  if (days === null) return points;
  const from = addDays(today, -days);
  return points.filter((point) => point.day >= from);
}

/**
 * Grafico di una misura (DEV-02: usato da cliente e staff). Accessibile:
 * titolo visibile, valori scritti sulle barre e sui punti (leggibili anche
 * senza colore), SVG nascosto agli screen reader e tabella equivalente.
 */
export function MetricChart(props: ChartProps) {
  const titleId = useId();
  const [range, setRange] = useState<Range>("all");

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <figcaption id={titleId} className="text-sm font-semibold">
        {props.title}
      </figcaption>
      {props.variant !== "week" ? (
        <RangePicker value={range} onChange={setRange} />
      ) : null}
    </div>
  );

  if (props.variant === "week") {
    const hasValues = props.days.some(
      (day) => day.current !== null || day.previous !== null,
    );
    const data = props.days.map((day) => ({
      ...day,
      label: formatWeekdayShort(day.day),
    }));
    return (
      <figure
        aria-labelledby={titleId}
        className={cn("flex flex-col gap-3", props.className)}
      >
        {header}
        {hasValues ? (
          <div aria-hidden="true">
            <ChartContainer
              config={weekConfig}
              className="aspect-[2/1] max-h-72 w-full"
            >
              <BarChart data={data} margin={{ top: 20, left: 0, right: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis hide domain={[0, props.max]} />
                <Bar
                  dataKey="previous"
                  fill="var(--color-previous)"
                  fillOpacity={0.35}
                  radius={4}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="previous"
                    position="top"
                    className="fill-muted-foreground text-xs"
                  />
                </Bar>
                <Bar
                  dataKey="current"
                  fill="var(--color-current)"
                  radius={4}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="current"
                    position="top"
                    className="fill-foreground text-xs font-semibold"
                  />
                </Bar>
              </BarChart>
            </ChartContainer>
            <ul className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm bg-muted-foreground/35" />
                {t.previousWeek}
              </li>
              <li className="flex items-center gap-1.5">
                <span className="size-3 rounded-sm bg-primary" />
                {t.currentWeek}
              </li>
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        )}
        <div className="sr-only">
          <table>
            <caption>{props.title}</caption>
            <thead>
              <tr>
                <th scope="col">{t.day}</th>
                <th scope="col">{t.currentWeek}</th>
                <th scope="col">{t.previousWeek}</th>
              </tr>
            </thead>
            <tbody>
              {props.days.map((day) => (
                <tr key={day.day}>
                  {/* il giorno della settimana vale per entrambe le colonne */}
                  <th scope="row">{formatWeekdayLong(day.day)}</th>
                  <td>{day.current ?? t.notRecorded}</td>
                  <td>{day.previous ?? t.notRecorded}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </figure>
    );
  }

  // in ordine cronologico per il grafico
  const points = inRange([...props.points], range, props.today).sort((a, b) =>
    a.day < b.day ? -1 : a.day > b.day ? 1 : 0,
  );
  const decimals = props.variant === "line" ? (props.decimals ?? 1) : 0;
  const format = (value: unknown) => formatDecimal(Number(value), decimals);
  const showLabels = points.length <= MAX_LABELS;

  return (
    <figure
      aria-labelledby={titleId}
      className={cn("flex flex-col gap-3", props.className)}
    >
      {header}
      {points.length > 0 ? (
        <div aria-hidden="true">
          <ChartContainer
            config={lineConfig}
            className="aspect-[2/1] max-h-72 w-full"
          >
            {props.variant === "line" ? (
              <LineChart
                data={points}
                margin={{ top: 24, left: 28, right: 28, bottom: 4 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatDayMonthShort}
                  minTickGap={16}
                />
                <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
                <Line
                  dataKey="value"
                  type="monotone"
                  stroke="var(--color-value)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "var(--color-value)" }}
                  isAnimationActive={false}
                >
                  {showLabels ? (
                    <LabelList
                      dataKey="value"
                      position="top"
                      formatter={format}
                      className="fill-foreground text-xs font-semibold"
                    />
                  ) : null}
                </Line>
              </LineChart>
            ) : (
              <BarChart data={points} margin={{ top: 20, left: 0, right: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={formatDayMonthShort}
                  minTickGap={8}
                />
                <YAxis hide domain={[0, props.max]} />
                <Bar
                  dataKey="value"
                  fill="var(--color-value)"
                  radius={4}
                  isAnimationActive={false}
                >
                  {showLabels ? (
                    <LabelList
                      dataKey="value"
                      position="top"
                      formatter={format}
                      className="fill-foreground text-xs font-semibold"
                    />
                  ) : null}
                </Bar>
              </BarChart>
            )}
          </ChartContainer>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      )}
      <div className="sr-only">
        <table>
          <caption>{props.title}</caption>
          <thead>
            <tr>
              <th scope="col">{t.date}</th>
              <th scope="col">{t.value}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point, index) => (
              <tr key={`${point.day}-${index}`}>
                <th scope="row">{formatLongDate(point.day)}</th>
                <td>
                  {props.variant === "line"
                    ? copy.tracking.valueWithUnit(
                        format(point.value),
                        props.unit,
                      )
                    : copy.tracking.score(point.value, props.max)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
