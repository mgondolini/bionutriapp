/**
 * Check delle misure (peso e circonferenze): una sola data per cliente.
 *
 * - Predefinita: ultima registrazione mensile + 30 giorni.
 * - Il nutrizionista la può spostare (`clients.measure_check_on`); la sua
 *   data vale finché non arriva una nuova registrazione mensile, dopo la
 *   quale si riparte da registrazione + 30.
 * - Mai registrato e nessuna data scelta: nessun check in calendario.
 * - Con un percorso attivo vale il percorso: il check è la prossima
 *   sessione di check ancora da fare (data della scheda Percorso). Una
 *   registrazione fatta da 3 giorni prima (`DUE_SOON_DAYS`) vale per quel
 *   check, quindi si passa al successivo. Data scelta e +30 giorni restano
 *   per chi non ha un percorso, o dopo l'ultimo check del percorso.
 */
import {
  CIRCUMFERENCE_INTERVAL_DAYS,
  DUE_SOON_DAYS,
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
  /** Check del percorso attivo ancora da fare ("YYYY-MM-DD", in ordine). */
  journeyChecks?: readonly string[];
};

export type MeasureCheck = {
  /** Giorno del prossimo check; null se non ce n'è uno. */
  dueOn: string | null;
  /** `journey` = check del percorso; `staff` = data scelta dal nutrizionista. */
  source: "journey" | "staff" | "default" | "none";
  /** Data predefinita (ultima + 30), per "Ripristina". */
  defaultDueOn: string | null;
};

/** Check (anche omaggio) del percorso attivo ancora da fare, in ordine di data. */
export function journeyCheckDates(
  sessions: readonly { type: string; status: string; date: string }[],
): string[] {
  return sessions
    .filter(
      (session) => session.status === "todo" && session.type !== "onboarding",
    )
    .map((session) => session.date)
    .sort();
}

/**
 * Primo check del percorso non ancora coperto da una registrazione: una
 * misura presa da `DUE_SOON_DAYS` giorni prima del check vale per quel check.
 */
export function journeyDueOn(
  journeyChecks: readonly string[],
  lastRecordedOn: string | null,
): string | null {
  return (
    journeyChecks.find(
      (day) => !lastRecordedOn || lastRecordedOn < addDays(day, -DUE_SOON_DAYS),
    ) ?? null
  );
}

export function measureCheck(input: MeasureCheckInput): MeasureCheck {
  const journey = journeyDueOn(input.journeyChecks ?? [], input.lastRecordedOn);
  const defaultDueOn = input.lastRecordedOn
    ? addDays(input.lastRecordedOn, CIRCUMFERENCE_INTERVAL_DAYS)
    : null;
  const overrideActive =
    input.override !== null &&
    (input.lastCreatedAt === null ||
      input.overrideSetAt === null ||
      Date.parse(input.lastCreatedAt) <= Date.parse(input.overrideSetAt));
  if (journey) return { dueOn: journey, source: "journey", defaultDueOn };
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
