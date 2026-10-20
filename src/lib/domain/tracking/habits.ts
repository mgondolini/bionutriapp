/**
 * Abitudini giornaliere (T-05, T-06, T-08): giorni compilati, media della
 * settimana e confronto con la precedente. La media considera solo i giorni
 * compilati, così un giorno saltato non abbassa il voto.
 */
import { addDays, isBetween, weekDays, weekStart } from "./dates";

export type DayValue = { recordedOn: string; value: number };

export type WeeklyHabitStats = {
  /** Lunedì e domenica della settimana corrente. */
  weekFrom: string;
  weekTo: string;
  /** Giorni compilati nella settimana corrente. */
  filledDays: number;
  /** Media della settimana corrente con un decimale; null se nessun giorno è compilato. */
  average: number | null;
  previousFilledDays: number;
  previousAverage: number | null;
  /** Differenza tra le due medie arrotondate; null se ne manca una. */
  delta: number | null;
  /** Voto di oggi, se registrato. */
  todayValue: number | null;
};

/** Arrotondamento a un decimale, senza residui della virgola mobile (0,8 e non 0,8000000001). */
export function roundOne(value: number): number {
  return Math.round(value * 10 + Number.EPSILON) / 10;
}

function averageOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return roundOne(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
}

function valuesBetween(entries: readonly DayValue[], from: string, to: string) {
  return entries
    .filter((entry) => isBetween(entry.recordedOn, from, to))
    .map((entry) => entry.value);
}

export function weeklyHabitStats(
  entries: readonly DayValue[],
  today: string,
): WeeklyHabitStats {
  const weekFrom = weekStart(today);
  const weekTo = addDays(weekFrom, 6);
  const previousFrom = addDays(weekFrom, -7);
  const previousTo = addDays(weekFrom, -1);

  // i giorni futuri della settimana non possono avere valori (controllo del database)
  const current = valuesBetween(entries, weekFrom, today);
  const previous = valuesBetween(entries, previousFrom, previousTo);
  const average = averageOf(current);
  const previousAverage = averageOf(previous);

  return {
    weekFrom,
    weekTo,
    filledDays: current.length,
    average,
    previousFilledDays: previous.length,
    previousAverage,
    // differenza delle medie mostrate, così i numeri sullo schermo tornano
    delta:
      average !== null && previousAverage !== null
        ? roundOne(average - previousAverage)
        : null,
    todayValue:
      entries.find((entry) => entry.recordedOn === today)?.value ?? null,
  };
}

export type HabitWeekDay = {
  /** Giorno della settimana corrente. */
  day: string;
  current: number | null;
  previous: number | null;
};

/** Voti giorno per giorno della settimana corrente e della precedente (grafico di C12). */
export function habitWeekSeries(
  entries: readonly DayValue[],
  today: string,
): HabitWeekDay[] {
  const byDay = new Map(
    entries.map((entry) => [entry.recordedOn, entry.value]),
  );
  return weekDays(weekStart(today)).map((day) => ({
    day,
    current: day <= today ? (byDay.get(day) ?? null) : null,
    previous: byDay.get(addDays(day, -7)) ?? null,
  }));
}
