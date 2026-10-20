/**
 * Diario degli allenamenti (T-09, A-13): voto medio, ultima sessione,
 * sessioni della settimana e degli ultimi 30 giorni.
 */
import { WORKOUT_RECENT_DAYS } from "@/lib/constants/domain";

import { addDays, isBetween, weekStart } from "./dates";
import { roundOne } from "./habits";

type WorkoutEntry = { value: number; recordedOn: string };

export type WorkoutPeriod = { count: number; average: number | null };

export type WorkoutStats<T extends WorkoutEntry = WorkoutEntry> = {
  all: WorkoutPeriod;
  week: WorkoutPeriod;
  recent: WorkoutPeriod;
  last: T | null;
};

function period(entries: readonly WorkoutEntry[]): WorkoutPeriod {
  if (entries.length === 0) return { count: 0, average: null };
  const sum = entries.reduce((total, entry) => total + entry.value, 0);
  return { count: entries.length, average: roundOne(sum / entries.length) };
}

/** `entries` dalla più recente. */
export function workoutStats<T extends WorkoutEntry>(
  entries: readonly T[],
  today: string,
): WorkoutStats<T> {
  const monday = weekStart(today);
  const recentFrom = addDays(today, -(WORKOUT_RECENT_DAYS - 1));
  return {
    all: period(entries),
    week: period(entries.filter((e) => isBetween(e.recordedOn, monday, today))),
    recent: period(
      entries.filter((e) => isBetween(e.recordedOn, recentFrom, today)),
    ),
    last: entries[0] ?? null,
  };
}
