import { LineChart } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { FormMessage } from "@/components/shared/form-message";
import { MetricCard, MetricRowList } from "@/components/shared/metric-card";
import { buttonVariants } from "@/components/ui/button";
import {
  METRIC_KINDS,
  checkinUrl,
  trackingMetricPath,
  type MetricKind,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import {
  averageText,
  habitDeltaText,
  scoreText,
} from "@/lib/domain/tracking/labels";
import {
  checkinStatus,
  type MetricOverview,
} from "@/lib/domain/tracking/overview";
import {
  formatDayMonthLong,
  formatDayMonthShort,
  formatWeekdayShort,
} from "@/lib/format";

const t = copy.client.tracking;
const tt = copy.tracking;

/** "6 registrazioni · ultima 8 set", "141 registrazioni · oggi 4/5", "58 registrazioni · ultimo 13 ott, 8/10". */
function metaFor(item: MetricOverview): string {
  const count = tt.entries(item.entries.length);
  const last = item.entries[0];
  switch (item.kind) {
    case "circumference":
      return last
        ? `${count} · ${tt.lastOn(formatDayMonthShort(last.recordedOn))}`
        : count;
    case "habit":
      return `${count} · ${
        item.stats.todayValue !== null
          ? tt.todayScore(
              scoreText(item.stats.todayValue, item.metric.maxValue),
            )
          : tt.todayMissing
      }`;
    case "workout":
      return last
        ? `${count} · ${tt.lastWorkout(
            formatDayMonthShort(last.recordedOn),
            scoreText(last.value, item.metric.maxValue),
          )}`
        : count;
  }
}

function CheckinCard({
  overview,
  today,
  canWrite,
}: {
  overview: MetricOverview[];
  today: string;
  canWrite: boolean;
}) {
  const { habits, missing } = checkinStatus(overview);
  if (habits.length === 0) return null;
  const done = missing.length === 0;
  return (
    <section
      aria-labelledby="checkin-card"
      className="flex flex-col gap-3 rounded-[18px] bg-mint p-5 text-mint-foreground"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="checkin-card"
          className="text-[19px] leading-tight font-bold tracking-tight"
        >
          {t.checkinCard.title}
        </h2>
        <p className="shrink-0 text-[12.5px] font-semibold">
          {t.checkinCard.date(
            formatWeekdayShort(today),
            formatDayMonthLong(today),
          )}
        </p>
      </div>
      <p className="text-sm leading-normal">
        {t.checkinCard.description}{" "}
        {t.checkinCard.missing(missing.length, habits.length)}
      </p>
      {canWrite ? (
        <Link
          href={checkinUrl()}
          className={buttonVariants({
            variant: done ? "mint-outline" : "default",
            className: "h-12 w-full rounded-xl",
          })}
        >
          {done ? t.checkinCard.ctaEdit : t.checkinCard.cta}
        </Link>
      ) : null}
    </section>
  );
}

function HabitAverages({ items }: { items: MetricOverview[] }) {
  const habits = items.filter(
    (item) => item.kind === "habit" && item.stats.average !== null,
  );
  if (habits.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-3">
      {habits.map((item) =>
        item.kind === "habit" && item.stats.average !== null ? (
          <li
            key={item.metric.id}
            className="flex flex-col gap-0.5 rounded-xl border bg-card px-3.5 py-3"
          >
            <span className="text-2xl font-bold tracking-tight">
              {averageText(item.stats.average)}
            </span>
            <span className="text-[12.5px] text-muted-foreground">
              {tt.weekAverage(item.metric.name)}
              {habitDeltaText(item.stats.delta, true)
                ? ` · ${habitDeltaText(item.stats.delta, true)}`
                : null}
            </span>
          </li>
        ) : null,
      )}
    </ul>
  );
}

function KindSection({
  kind,
  items,
}: {
  kind: MetricKind;
  items: MetricOverview[];
}) {
  if (items.length === 0) return null;
  const id = `tracking-${kind}`;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id={id} className="text-[17px] font-bold">
          {tt.kinds[kind].title}
        </h2>
        <span className="text-[13px] text-muted-foreground">
          {tt.kinds[kind].hint}
        </span>
      </div>
      <MetricRowList>
        {items.map((item) => (
          <li key={item.metric.id}>
            <MetricCard
              layout="row"
              kind={item.kind}
              icon={item.metric.icon}
              title={item.metric.name}
              description={item.metric.instructions}
              meta={metaFor(item)}
              status={
                item.kind === "circumference"
                  ? item.summary.schedule.status
                  : null
              }
              recorded={item.recordedInPeriod}
              href={trackingMetricPath(item.metric.key)}
            />
          </li>
        ))}
      </MetricRowList>
      {kind === "habit" ? <HabitAverages items={items} /> : null}
    </section>
  );
}

/** Pagina Tracking (C8, T-01): check-in in cima, poi le misure per tipo. */
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
  return (
    <div className="flex flex-col gap-4">
      {canWrite ? null : <FormMessage tone="info">{t.readOnly}</FormMessage>}
      <CheckinCard overview={overview} today={today} canWrite={canWrite} />
      {METRIC_KINDS.map((kind) => (
        <KindSection
          key={kind}
          kind={kind}
          items={overview.filter((item) => item.kind === kind)}
        />
      ))}
    </div>
  );
}
