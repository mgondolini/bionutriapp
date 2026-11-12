/** Date e ore delle foto, come nel mockup ("30 ott, 08:41", "oggi, 08:41"). */
import { copy } from "@/lib/copy/it";
import { addDays, todayInRome } from "@/lib/domain/tracking/dates";
import {
  dayInRome,
  formatDayMonthLong,
  formatDayMonthShort,
  formatLongDate,
  formatTimeInRome,
} from "@/lib/format";

/** "30 ott, 08:41" */
export function shortWhen(iso: string): string {
  return `${formatDayMonthShort(iso)}, ${formatTimeInRome(iso)}`;
}

/** "30 ott alle 08:41" */
export function shortWhenAt(iso: string): string {
  return copy.photos.at(formatDayMonthShort(iso), formatTimeInRome(iso));
}

/** "oggi, 08:41", "ieri, 08:41", "30 ott, 08:41" */
export function relativeWhen(iso: string): string {
  const day = dayInRome(iso);
  const today = todayInRome();
  const label =
    day === today
      ? copy.photos.today
      : day === addDays(today, -1)
        ? copy.photos.yesterday
        : formatDayMonthShort(iso);
  return `${label}, ${formatTimeInRome(iso)}`;
}

/** Data e ora del salvataggio: "23 luglio 2026" e "09:12". */
export function savedParts(iso: string) {
  return {
    date: formatLongDate(dayInRome(iso)),
    dayMonth: formatDayMonthLong(dayInRome(iso)),
    time: formatTimeInRome(iso),
  };
}
