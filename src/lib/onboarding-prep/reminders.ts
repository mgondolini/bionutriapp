/**
 * Promemoria e scadenza della preparazione (C32): alle 18 nel fuso dello
 * studio, 2 giorni e 1 giorno prima della chiamata, solo se manca qualcosa.
 * Senza data della chiamata non parte niente.
 */
import {
  PREP_DEADLINE_DAYS_BEFORE,
  PREP_REMINDER_DAYS_BEFORE,
  PREP_REMINDER_HOUR,
} from "@/lib/constants/domain";
import { addDays } from "@/lib/domain/tracking/dates";

import type { PrepStatus } from "./status";

export type PrepReminderKind = "prep_2d" | "prep_1d";

export type PrepReminder = {
  kind: PrepReminderKind;
  day: string;
  hour: number;
};

const KIND_BY_DAYS: Record<
  (typeof PREP_REMINDER_DAYS_BEFORE)[number],
  PrepReminderKind
> = {
  2: "prep_2d",
  1: "prep_1d",
};

/** Giorno entro cui mandare misure e foto: il giorno prima della chiamata. */
export function prepDeadline(callDate: string): string {
  return addDays(callDate, -PREP_DEADLINE_DAYS_BEFORE);
}

/** Quali promemoria partono e quando; nessuno se è tutto inviato o manca la data. */
export function getReminderPlan(
  callDate: string | null,
  status: Pick<PrepStatus, "complete">,
): PrepReminder[] {
  if (!callDate || status.complete) return [];
  return PREP_REMINDER_DAYS_BEFORE.map((days) => ({
    kind: KIND_BY_DAYS[days],
    day: addDays(callDate, -days),
    hour: PREP_REMINDER_HOUR,
  }));
}

/**
 * Turno del cron: a quest'ora (locale dello studio) partono i promemoria
 * per le chiamate fra 1 e 2 giorni; null alle altre ore.
 */
export function prepReminderWindow(local: {
  day: string;
  hour: number;
}): { from: string; to: string } | null {
  if (local.hour !== PREP_REMINDER_HOUR) return null;
  const days = [...PREP_REMINDER_DAYS_BEFORE].sort((a, b) => a - b);
  return {
    from: addDays(local.day, days[0]!),
    to: addDays(local.day, days[days.length - 1]!),
  };
}

/** Tipo del promemoria di una chiamata in questo turno. */
export function prepReminderKind(
  callDate: string,
  localDay: string,
): PrepReminderKind | null {
  for (const days of PREP_REMINDER_DAYS_BEFORE) {
    if (addDays(localDay, days) === callDate) return KIND_BY_DAYS[days];
  }
  return null;
}
