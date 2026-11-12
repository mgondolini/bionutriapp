/**
 * Date del percorso (DEV-10): giorni di calendario "YYYY-MM-DD" senza ora,
 * calcolati in UTC a mezzogiorno come il resto dell'app, così il fuso e
 * l'ora legale non spostano mai un giorno.
 */
import type { JourneyDuration } from "@/lib/constants/domain";
import { addDays, daysBetween } from "@/lib/domain/tracking/dates";

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * Stesso giorno `months` mesi dopo; se quel mese è più corto ci si ferma
 * all'ultimo giorno (31 agosto + 6 mesi = 28 o 29 febbraio), come Postgres.
 */
export function addMonths(day: string, months: number): string {
  const [year, month, date] = day.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const total = year * 12 + (month - 1) + months;
  const y = Math.floor(total / 12);
  const m = total - y * 12;
  const d = Math.min(date, daysInMonth(y, m));
  return `${String(y).padStart(4, "0")}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Fine del percorso: inizio + 6 o 12 mesi (non si modifica a mano). */
export function journeyEndDate(
  start: string,
  durationMonths: JourneyDuration,
): string {
  return addMonths(start, durationMonths);
}

/**
 * Date a distanza regolare: sessione i (0…N-1) = inizio +
 * round(i × giorni_totali / (N-1)). La prima cade sull'inizio, l'ultima
 * sulla fine.
 */
export function calculateSessionDates(
  start: string,
  durationMonths: JourneyDuration,
  sessionCount: number,
): string[] {
  if (sessionCount <= 0) return [];
  if (sessionCount === 1) return [start];
  const total = daysBetween(start, journeyEndDate(start, durationMonths));
  return Array.from({ length: sessionCount }, (_, i) =>
    addDays(start, Math.round((i * total) / (sessionCount - 1))),
  );
}

/** Mesi interi trascorsi da `from` a `to` (0 se `to` è prima). */
export function monthsBetween(from: string, to: string): number {
  if (to < from) return 0;
  let months = 0;
  while (addMonths(from, months + 1) <= to) months += 1;
  return months;
}
