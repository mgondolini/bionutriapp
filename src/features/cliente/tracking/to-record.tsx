import { CalendarCheck, CircleCheck } from "lucide-react";
import Link from "next/link";

import { MetricCard, MetricRowList } from "@/components/shared/metric-card";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES, checkinUrl, trackingMetricPath } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { measureText, scoreText } from "@/lib/domain/tracking/labels";
import {
  pendingCount,
  type ToRecordItem,
  type WorkoutOverview,
} from "@/lib/domain/tracking/overview";
import { formatDayMonthShort } from "@/lib/format";

const t = copy.client.tracking.toRecord;

function workoutMeta({ metric, stats, recordedInPeriod }: WorkoutOverview) {
  const last = stats.last;
  if (!last) return t.workoutNone;
  const score = scoreText(last.value, metric.maxValue);
  return recordedInPeriod
    ? t.workoutToday(score)
    : t.workoutLast(formatDayMonthShort(last.recordedOn), score);
}

/**
 * Riepilogo "Da registrare" della home (C-02, schermata C5). Gli allenamenti
 * ci sono sempre (riga in fondo con la spunta se c'è una sessione oggi), ma
 * non contano tra le misure da registrare. Misure e check-in da fare hanno
 * l'icona su pesca ("richiede attenzione"); gli allenamenti restano azzurri.
 */
export function ToRecord({ items }: { items: ToRecordItem[] }) {
  const pending = pendingCount(items);
  return (
    <section aria-labelledby="to-record" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="to-record" className="text-[17px] font-bold">
          {copy.client.home.toRecordTitle}
        </h2>
        {pending > 0 ? (
          <span className="text-[13px] text-muted-foreground">
            {t.count(pending)}
          </span>
        ) : null}
      </div>
      {pending === 0 ? (
        <p className="flex items-center gap-2 rounded-[14px] border bg-card px-4 py-3 text-sm">
          <CircleCheck aria-hidden="true" className="size-5 text-primary-ink" />
          {t.allDone}
        </p>
      ) : null}
      {items.length > 0 ? (
        <MetricRowList>
          {items.map((item) =>
            item.kind === "checkin" ? (
              <li key="checkin">
                <Link
                  href={checkinUrl()}
                  className="flex min-h-16 items-center gap-3 bg-card px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning text-secondary-foreground">
                    <CalendarCheck aria-hidden="true" className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-[15px] font-semibold">
                      {t.checkin}
                    </span>
                    <span className="text-[12.5px] text-muted-foreground">
                      {t.checkinMissing(
                        item.missing.map((habit) => habit.metric.name),
                      )}
                    </span>
                  </span>
                  <span className="rounded-full bg-mint px-2.5 py-1 text-xs leading-none font-semibold text-mint-foreground">
                    {t.today}
                  </span>
                </Link>
              </li>
            ) : item.kind === "workout" ? (
              <li key={item.item.metric.id}>
                <MetricCard
                  layout="row"
                  kind="workout"
                  icon={item.item.metric.icon}
                  title={item.item.metric.name}
                  meta={workoutMeta(item.item)}
                  recorded={item.item.recordedInPeriod}
                  href={trackingMetricPath(item.item.metric.key)}
                />
              </li>
            ) : (
              <li key={item.item.metric.id}>
                <MetricCard
                  layout="row"
                  kind="circumference"
                  icon={item.item.metric.icon}
                  title={item.item.metric.name}
                  meta={
                    item.item.summary.last
                      ? t.lastValue(
                          measureText(
                            item.item.summary.last.value,
                            item.item.metric.unit,
                          ),
                          formatDayMonthShort(
                            item.item.summary.last.recordedOn,
                          ),
                        )
                      : t.never
                  }
                  status={item.status}
                  attention
                  href={trackingMetricPath(item.item.metric.key)}
                />
              </li>
            ),
          )}
        </MetricRowList>
      ) : null}
      <Link
        href={ROUTES.client.tracking}
        className={buttonVariants({
          variant: "outline",
          className: "w-full",
        })}
      >
        {t.cta}
      </Link>
    </section>
  );
}
