import { CalendarCheck, CircleCheck } from "lucide-react";
import Link from "next/link";

import { MetricCard, MetricRowList } from "@/components/shared/metric-card";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES, checkinUrl, trackingMetricPath } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { measureText } from "@/lib/domain/tracking/labels";
import type { ToRecordItem } from "@/lib/domain/tracking/overview";
import { formatDayMonthShort } from "@/lib/format";

const t = copy.client.tracking.toRecord;

/** Riepilogo "Da registrare" della home (C-02, schermata C5). */
export function ToRecord({ items }: { items: ToRecordItem[] }) {
  return (
    <section aria-labelledby="to-record" className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="to-record" className="text-[17px] font-bold">
          {copy.client.home.toRecordTitle}
        </h2>
        {items.length > 0 ? (
          <span className="text-[13px] text-muted-foreground">
            {t.count(items.length)}
          </span>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 rounded-[14px] border bg-card px-4 py-3 text-sm">
          <CircleCheck aria-hidden="true" className="size-5 text-primary-ink" />
          {t.allDone}
        </p>
      ) : (
        <MetricRowList>
          {items.map((item) =>
            item.kind === "checkin" ? (
              <li key="checkin">
                <Link
                  href={checkinUrl()}
                  className="flex min-h-16 items-center gap-3 bg-card px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-primary-ink">
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
                  href={trackingMetricPath(item.item.metric.key)}
                />
              </li>
            ),
          )}
        </MetricRowList>
      )}
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
