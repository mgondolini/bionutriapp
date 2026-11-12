/**
 * Check delle misure (peso e circonferenze): una sola data per cliente.
 *
 * - Predefinita: ultima registrazione mensile + 30 giorni.
 * - Il nutrizionista la può spostare (`clients.measure_check_on`); la sua
 *   data vale finché non arriva una nuova registrazione mensile, dopo la
 *   quale si riparte da registrazione + 30.
 * - Mai registrato e nessuna data scelta: nessun check in calendario.
 */
import { CIRCUMFERENCE_INTERVAL_DAYS } from "@/lib/constants/domain";

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

export type MeasureCheckReminder = "eve" | "day";

/** Promemoria delle 6: il giorno prima ("eve") e il giorno stesso ("day"). */
export function measureCheckReminder(
  dueOn: string | null,
  today: string,
): MeasureCheckReminder | null {
  if (!dueOn) return null;
  if (dueOn === today) return "day";
  if (dueOn === addDays(today, 1)) return "eve";
  return null;
}
