import Link from "next/link";

import { HabitWeekSummary } from "@/components/shared/habit-summary";
import { buttonVariants } from "@/components/ui/button";
import { checkinUrl } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import type { HabitOverview } from "@/lib/domain/tracking/overview";

const t = copy.client.tracking.habit;

/** Settimana dell'abitudine (C12) con l'invito a compilare il voto di oggi. */
export function HabitWeek({
  item,
  today,
  canWrite,
}: {
  item: HabitOverview;
  today: string;
  canWrite: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <HabitWeekSummary item={item} today={today} />
      {canWrite && item.stats.todayValue === null ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary/10 px-4 py-3">
          <p className="text-sm">{t.todayMissing}</p>
          <Link href={checkinUrl()} className={buttonVariants()}>
            {t.todayCta}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
