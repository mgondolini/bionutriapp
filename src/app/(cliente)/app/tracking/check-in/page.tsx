import Link from "next/link";
import { redirect } from "next/navigation";

import { FormMessage } from "@/components/shared/form-message";
import { CheckinForm } from "@/features/cliente/tracking/checkin-form";
import { TrackingHeader } from "@/features/cliente/tracking/tracking-header";
import {
  CHECKIN_DAYS,
  CHECKIN_DAY_PARAM,
  ROUTES,
  checkinUrl,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatDayMonthShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { requireClient } from "@/server/services/session.service";
import {
  clientTrackingActor,
  getCheckin,
} from "@/server/services/tracking.service";
import { checkinDayParamSchema } from "@/server/validation/tracking.schema";

const t = copy.client.tracking.checkin;

/** Check-in giornaliero (C9, T-06): oggi o ieri, valori precaricati se il giorno è già compilato. */
export default async function CheckinPage({
  searchParams,
}: PageProps<"/app/tracking/check-in">) {
  const session = await requireClient({ unlocked: true });
  const actor = clientTrackingActor(session);
  if (!actor) redirect(ROUTES.client.home);
  if (!actor.canWrite) redirect(ROUTES.client.tracking);

  const day = checkinDayParamSchema.parse(
    (await searchParams)[CHECKIN_DAY_PARAM],
  );
  const checkin = await getCheckin(actor, day);
  const dates = { today: checkin.today, yesterday: checkin.yesterday };

  return (
    <div className="flex flex-col gap-4">
      <TrackingHeader title={t.title} />
      <nav
        aria-label={t.dayLabel}
        className="grid grid-cols-2 overflow-hidden rounded-xl border border-line-strong bg-card"
      >
        {[...CHECKIN_DAYS].reverse().map((option) => (
          <Link
            key={option}
            href={checkinUrl(option)}
            replace
            aria-current={option === day ? "page" : undefined}
            className={cn(
              "flex h-11 items-center justify-center text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset",
              option === day
                ? "bg-foreground font-semibold text-background"
                : "text-secondary-foreground hover:bg-muted",
            )}
          >
            {t.days[option](formatDayMonthShort(dates[option]))}
          </Link>
        ))}
      </nav>
      {checkin.habits.length === 0 ? (
        <FormMessage tone="info">
          {copy.client.sections.tracking.emptyDescription}
        </FormMessage>
      ) : (
        <CheckinForm key={checkin.date} checkin={checkin} />
      )}
    </div>
  );
}
