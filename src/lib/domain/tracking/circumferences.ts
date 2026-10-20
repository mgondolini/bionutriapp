/**
 * Circonferenze (T-05, A-12): scadenza ogni 30 giorni, variazioni e storico.
 */
import {
  CIRCUMFERENCE_INTERVAL_DAYS,
  DUE_SOON_DAYS,
} from "@/lib/constants/domain";

import { addDays, daysBetween } from "./dates";

/**
 * - `ok`: registrata da al massimo 30 giorni e la scadenza non è vicina;
 * - `due_soon`: registrata, ma la scadenza arriva entro 3 giorni;
 * - `overdue`: più di 30 giorni dall'ultima registrazione;
 * - `never`: mai registrata (nessuna data da cui contare: non è "in ritardo").
 */
export type CircumferenceStatus = "ok" | "due_soon" | "overdue" | "never";

export type CircumferenceSchedule = {
  status: CircumferenceStatus;
  /** Giorno entro cui registrare la prossima misura (ultima + 30). */
  dueOn: string | null;
  /** Giorni dall'ultima registrazione. */
  daysSince: number | null;
  /** Giorni che mancano alla scadenza (negativi se in ritardo). */
  daysLeft: number | null;
};

export function circumferenceSchedule(
  lastRecordedOn: string | null,
  today: string,
): CircumferenceSchedule {
  if (!lastRecordedOn) {
    return { status: "never", dueOn: null, daysSince: null, daysLeft: null };
  }
  const daysSince = daysBetween(lastRecordedOn, today);
  const daysLeft = CIRCUMFERENCE_INTERVAL_DAYS - daysSince;
  const status: CircumferenceStatus =
    daysLeft < 0 ? "overdue" : daysLeft <= DUE_SOON_DAYS ? "due_soon" : "ok";
  return {
    status,
    dueOn: addDays(lastRecordedOn, CIRCUMFERENCE_INTERVAL_DAYS),
    daysSince,
    daysLeft,
  };
}

/** Spunta di T-01: c'è un valore negli ultimi 30 giorni. */
export function isRecordedInPeriod(schedule: CircumferenceSchedule): boolean {
  return schedule.status === "ok" || schedule.status === "due_soon";
}

export type MeasureEntry = {
  id: string;
  value: number;
  recordedOn: string;
};

export type MeasureHistoryRow<T extends MeasureEntry> = T & {
  /** Differenza con la registrazione precedente; null per la prima. */
  delta: number | null;
};

/** Differenza arrotondata ai centesimi (i valori hanno al massimo due decimali). */
function difference(value: number, previous: number): number {
  return Math.round((value - previous) * 100) / 100;
}

/**
 * Storico dalla più recente, con la variazione rispetto alla precedente.
 * `entries` è già ordinato dalla più recente.
 */
export function measureHistory<T extends MeasureEntry>(
  entries: readonly T[],
): MeasureHistoryRow<T>[] {
  return entries.map((entry, index) => {
    const previous = entries[index + 1];
    return {
      ...entry,
      delta: previous ? difference(entry.value, previous.value) : null,
    };
  });
}

export type CircumferenceSummary<T extends MeasureEntry = MeasureEntry> = {
  last: T | null;
  previous: T | null;
  first: T | null;
  /** Variazione dell'ultima rispetto alla precedente. */
  delta: number | null;
  /** Variazione dall'inizio (prima registrazione); null con meno di due valori. */
  deltaFromStart: number | null;
  schedule: CircumferenceSchedule;
};

/** Riepilogo di una circonferenza (card di A9, dettaglio A10). `entries` dalla più recente. */
export function circumferenceSummary<T extends MeasureEntry>(
  entries: readonly T[],
  today: string,
): CircumferenceSummary<T> {
  const last = entries[0] ?? null;
  const previous = entries[1] ?? null;
  const first = entries.length > 1 ? entries[entries.length - 1]! : null;
  return {
    last,
    previous,
    first,
    delta: last && previous ? difference(last.value, previous.value) : null,
    deltaFromStart: last && first ? difference(last.value, first.value) : null,
    schedule: circumferenceSchedule(last?.recordedOn ?? null, today),
  };
}
