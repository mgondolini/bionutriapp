import { DAILY_REMINDER_HOUR } from "@/lib/constants/domain";

import type { DailyCheckinVariant } from "./catalog";

/*
 * Ora del promemoria serale (funzioni pure). Il cron gira ogni ora: qui si
 * decide quali studi sono alle 20 nel PROPRIO fuso, così l'ora legale non va
 * gestita a mano e non si assume mai l'ora UTC.
 */

/** Giorno "YYYY-MM-DD" e ora (0–23) di `now` nel fuso `timeZone`. */
export function localDateTime(
  now: Date,
  timeZone: string,
): { day: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: `${part("year")}-${part("month")}-${part("day")}`,
    hour: Number(part("hour")),
  };
}

/** Nome IANA valido (es. "Europe/Rome"): il database non lo controlla. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function isReminderHour(now: Date, timeZone: string): boolean {
  return localDateTime(now, timeZone).hour === DAILY_REMINDER_HOUR;
}

export type DailyReminderDecision =
  | { send: false; reason: "already_completed" }
  | { send: true; variant: DailyCheckinVariant };

/**
 * Abitudini del giorno tutte compilate: niente promemoria. Altrimenti il
 * testo ricorda anche l'allenamento se oggi non ce n'è uno.
 */
export function decideDailyReminder(day: {
  habitsDone: boolean;
  workoutDone: boolean;
}): DailyReminderDecision {
  if (day.habitsDone) return { send: false, reason: "already_completed" };
  return { send: true, variant: day.workoutDone ? "base" : "workout" };
}
