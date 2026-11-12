/**
 * Elenco delle note cliniche: l'anamnesi sempre in cima, poi le note di
 * visita dalla più recente (a parità di data, l'ultima creata).
 */
import type { ClientNoteKind } from "@/lib/constants/domain";

export type NoteListItem = {
  id: string;
  kind: ClientNoteKind;
  visitDate: string | null;
  createdAt: string;
};

export function sortNotes<T extends NoteListItem>(notes: readonly T[]): T[] {
  return [...notes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "anamnesis" ? -1 : 1;
    const byDate = (b.visitDate ?? "").localeCompare(a.visitDate ?? "");
    return byDate !== 0 ? byDate : b.createdAt.localeCompare(a.createdAt);
  });
}

/** Quando è stata modificata: oggi, ieri o un altro giorno (a Roma). */
export function updatedDay(
  updatedDayInRome: string,
  today: string,
  yesterday: string,
): "today" | "yesterday" | "other" {
  if (updatedDayInRome === today) return "today";
  if (updatedDayInRome === yesterday) return "yesterday";
  return "other";
}
