/**
 * Giorni di calendario "YYYY-MM-DD" (DEV-10). "Oggi" si ricava sempre nel
 * fuso Europe/Rome (dayInRome); i calcoli tra giorni avvengono in UTC a
 * mezzogiorno, così l'ora legale non sposta mai un giorno.
 */
import { dayInRome } from "@/lib/format";

const DAY_MS = 24 * 60 * 60 * 1000;

function toUtc(day: string): number {
  return Date.parse(`${day}T12:00:00Z`);
}

function fromUtc(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

/** Giorno di oggi a Roma (di default adesso). */
export function todayInRome(now: Date = new Date()): string {
  return dayInRome(now);
}

export function addDays(day: string, days: number): string {
  return fromUtc(toUtc(day) + days * DAY_MS);
}

/** Giorni da `from` a `to` (positivo se `to` è dopo). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

/** Lunedì della settimana del giorno (settimana da lunedì a domenica). */
export function weekStart(day: string): string {
  const weekday = new Date(toUtc(day)).getUTCDay(); // 0 = domenica
  return addDays(day, -((weekday + 6) % 7));
}

/** I 7 giorni della settimana che inizia il lunedì `start`. */
export function weekDays(start: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** Vero se `day` cade tra `from` e `to`, estremi compresi. */
export function isBetween(day: string, from: string, to: string): boolean {
  return day >= from && day <= to;
}
