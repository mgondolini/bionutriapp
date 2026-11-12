import { copy } from "@/lib/copy/it";
import { updatedDay } from "@/lib/domain/client-notes/list";
import { addDays } from "@/lib/domain/tracking/dates";
import { dayInRome, formatShortDate, formatTimeInRome } from "@/lib/format";

const t = copy.clientNotes;

function when(updatedAt: string, now: Date) {
  const today = dayInRome(now);
  return [
    updatedDay(dayInRome(updatedAt), today, addDays(today, -1)),
    formatTimeInRome(updatedAt),
    formatShortDate(dayInRome(updatedAt)),
  ] as const;
}

/** "Aggiornata oggi, 18:42", "Aggiornata ieri, 9:10", "Aggiornata il 10 nov 2026". */
export function updatedLabel(updatedAt: string, now = new Date()): string {
  return t.updated(...when(updatedAt, now));
}

/** "Salvato, oggi alle 18:42". */
export function savedLabel(updatedAt: string, now = new Date()): string {
  return t.status.clean(...when(updatedAt, now));
}
