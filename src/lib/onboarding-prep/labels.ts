/** Date della preparazione nei testi: "Giovedì 15 ottobre, ore 18:00", "mercoledì 14 ottobre". */
import { copy } from "@/lib/copy/it";
import { formatDayMonthLong, formatWeekdayLong } from "@/lib/format";

import { prepDeadline } from "./reminders";

/** "Giovedì 15 ottobre" */
export function callDayText(date: string): string {
  return `${formatWeekdayLong(date)} ${formatDayMonthLong(date)}`;
}

/** "Giovedì 15 ottobre, ore 18:00" (senza ora: solo il giorno). */
export function callWhenText(date: string, time: string | null): string {
  return copy.onboardingPrep.callWhen(callDayText(date), time);
}

/** "giovedì": per le frasi ("ti chiama giovedì"). */
export function weekdayText(date: string): string {
  return formatWeekdayLong(date).toLocaleLowerCase("it-IT");
}

/** "mercoledì 14 ottobre": il giorno entro cui mandare misure e foto. */
export function deadlineText(callDate: string): string {
  const day = prepDeadline(callDate);
  return `${weekdayText(day)} ${formatDayMonthLong(day)}`;
}
