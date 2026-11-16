/**
 * Check delle misure (peso e circonferenze): una sola data per cliente.
 *
 * - Predefinita: ultima registrazione mensile + 30 giorni.
 * - Il nutrizionista la può spostare (`clients.measure_check_on`); la sua
 *   data vale finché non arriva una nuova registrazione mensile, dopo la
 *   quale si riparte da registrazione + 30.
 * - Mai registrato e nessuna data scelta: nessun check in calendario.
 */
import {
  CIRCUMFERENCE_INTERVAL_DAYS,
  MEASURE_CHECK_REMINDER_DAYS,
} from "@/lib/constants/domain";

import { addDays } from "./dates";

export type MeasureCheckInput = {
  /** Data scelta dal nutrizionista ("YYYY-MM-DD"). */
  override: string | null;
  /** Quando l'ha scelta (ISO, scritto dal trigger). */
  overrideSetAt: string | null;
  /** Giorno dell'ultima registrazione mensile. */
  lastRecordedOn: string | null;
  /** Inserimento dell'ultima registrazione mensile (ISO). */
  lastCreatedAt: string | null;
};

export type MeasureCheck = {
  /** Giorno del prossimo check; null se non ce n'è uno. */
  dueOn: string | null;
  /** `staff` = data scelta dal nutrizionista. */
  source: "staff" | "default" | "none";
  /** Data predefinita (ultima + 30), per "Ripristina". */
  defaultDueOn: string | null;
};

export function measureCheck(input: MeasureCheckInput): MeasureCheck {
  const defaultDueOn = input.lastRecordedOn
    ? addDays(input.lastRecordedOn, CIRCUMFERENCE_INTERVAL_DAYS)
    : null;
  const overrideActive =
    input.override !== null &&
    (input.lastCreatedAt === null ||
      input.overrideSetAt === null ||
      Date.parse(input.lastCreatedAt) <= Date.parse(input.overrideSetAt));
  if (overrideActive) {
    return { dueOn: input.override, source: "staff", defaultDueOn };
  }
  return defaultDueOn
    ? { dueOn: defaultDueOn, source: "default", defaultDueOn }
    : { dueOn: null, source: "none", defaultDueOn };
}

/** Momento del promemoria: 3 e 2 giorni prima, il giorno prima, il giorno stesso. */
export type MeasureCheckReminder = "d3" | "d2" | "eve" | "day";

const REMINDER_BY_DAYS: Record<number, MeasureCheckReminder> = {
  3: "d3",
  2: "d2",
  1: "eve",
  0: "day",
};

/**
 * Promemoria delle 6: 3, 2 e 1 giorno prima e il giorno stesso
 * (`MEASURE_CHECK_REMINDER_DAYS`, la stessa finestra di "In scadenza" della
 * home). Le chiavi "eve" e "day" restano quelle già nel registro.
 */
export function measureCheckReminder(
  dueOn: string | null,
  today: string,
): MeasureCheckReminder | null {
  if (!dueOn) return null;
  const daysBefore = MEASURE_CHECK_REMINDER_DAYS.find(
    (days) => addDays(today, days) === dueOn,
  );
  return daysBefore === undefined ? null : REMINDER_BY_DAYS[daysBefore]!;
}
