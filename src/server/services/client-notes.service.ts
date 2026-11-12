import "server-only";

import {
  ANAMNESIS_TITLE,
  VISIT_NOTE_DEFAULT_TITLE,
  type ClientNoteKind,
} from "@/lib/constants/domain";
import {
  emptyNoteDoc,
  noteContentToText,
  noteExcerpt,
  sanitizeNoteDoc,
  type NoteDoc,
} from "@/lib/domain/client-notes/content";
import { sortNotes } from "@/lib/domain/client-notes/list";
import { todayInRome } from "@/lib/domain/tracking/dates";
import * as clientNotesRepository from "@/server/repositories/client-notes.repository";
import * as clientsRepository from "@/server/repositories/clients.repository";
import type { SaveNoteValues } from "@/server/validation/client-notes.schema";

/*
 * Note cliniche dello staff: l'anamnesi si crea al primo accesso alla
 * scheda, le note di visita con "Nuova nota". Il cliente non le legge mai
 * (nessuna policy per lui). Il salvataggio non sovrascrive una versione più
 * recente salvata da un altro dispositivo (conflict), salvo richiesta.
 */

export type NoteListEntry = {
  id: string;
  kind: ClientNoteKind;
  title: string;
  visitDate: string | null;
  excerpt: string;
  createdAt: string;
  updatedAt: string;
};

export type NoteDetail = Omit<NoteListEntry, "excerpt" | "createdAt"> & {
  clientId: string;
  content: NoteDoc;
};

export type StaffNotes = {
  notes: NoteListEntry[];
  /** La nota aperta; null se non richiesta o non di questo cliente. */
  selected: NoteDetail | null;
};

export type NoteFailure = "not_found" | "conflict" | "anamnesis";

type Result<T> = { ok: true; data: T } | { ok: false; reason: NoteFailure };

async function ownsClient(studioId: string, clientId: string) {
  const client = await clientsRepository.getClientProfile(clientId);
  return client?.studio_id === studioId;
}

async function loadOwnedNote(studioId: string, noteId: string) {
  const note = await clientNotesRepository.getNote(noteId);
  return note?.studio_id === studioId ? note : null;
}

type ListRow = Awaited<
  ReturnType<typeof clientNotesRepository.listNotes>
>[number];

function toListEntry(row: ListRow): NoteListEntry {
  return {
    id: row.id,
    kind: row.kind as ClientNoteKind,
    title: row.title,
    visitDate: row.visit_date,
    excerpt: noteExcerpt(row.content_text),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Elenco delle note (anamnesi in cima, creata se manca) e, se richiesta, la
 * nota aperta con il contenuto; null se il cliente non è dello studio.
 */
export async function getStaffNotes(
  studioId: string,
  clientId: string,
  noteId?: string,
): Promise<StaffNotes | null> {
  if (!(await ownsClient(studioId, clientId))) return null;
  const [listed, note] = await Promise.all([
    clientNotesRepository.listNotes(clientId),
    noteId ? clientNotesRepository.getNote(noteId) : null,
  ]);
  let rows = listed;
  if (!rows.some((row) => row.kind === "anamnesis")) {
    // due aperture insieme: l'indice unico ne lascia passare una sola
    await clientNotesRepository.insertNote({
      studioId,
      clientId,
      kind: "anamnesis",
      title: ANAMNESIS_TITLE,
      visitDate: null,
      content: emptyNoteDoc(),
      contentText: "",
    });
    rows = await clientNotesRepository.listNotes(clientId);
  }
  const selected =
    note && note.client_id === clientId && note.studio_id === studioId
      ? note
      : null;
  return {
    notes: sortNotes(rows.map(toListEntry)),
    selected: selected
      ? {
          id: selected.id,
          clientId: selected.client_id,
          kind: selected.kind as ClientNoteKind,
          title: selected.title,
          visitDate: selected.visit_date,
          updatedAt: selected.updated_at,
          // un contenuto non leggibile (mai atteso) si apre vuoto, non rompe la pagina
          content: sanitizeNoteDoc(selected.content) ?? emptyNoteDoc(),
        }
      : null,
  };
}

/** "Nuova nota": "Visita di controllo" con la data di oggi. */
export async function createVisitNote(
  studioId: string,
  clientId: string,
): Promise<Result<{ id: string }>> {
  if (!(await ownsClient(studioId, clientId))) {
    return { ok: false, reason: "not_found" };
  }
  const row = await clientNotesRepository.insertNote({
    studioId,
    clientId,
    kind: "visit",
    title: VISIT_NOTE_DEFAULT_TITLE,
    visitDate: todayInRome(),
    content: emptyNoteDoc(),
    contentText: "",
  });
  if (!row) return { ok: false, reason: "not_found" };
  return { ok: true, data: { id: row.id } };
}

/**
 * Salva titolo, data (solo note di visita) e contenuto già ripulito dallo
 * schema; il testo semplice si ricava qui, mai dal browser.
 */
export async function saveNote(
  studioId: string,
  input: SaveNoteValues,
): Promise<
  Result<{
    clientId: string;
    title: string;
    visitDate: string | null;
    updatedAt: string;
  }>
> {
  const note = await loadOwnedNote(studioId, input.noteId);
  if (!note) return { ok: false, reason: "not_found" };
  const visitDate =
    note.kind === "visit" ? (input.visitDate ?? note.visit_date) : null;
  const saved = await clientNotesRepository.updateNote(
    note.id,
    {
      title: input.title,
      visitDate,
      content: input.content,
      contentText: noteContentToText(input.content),
    },
    input.force ? null : input.expectedUpdatedAt,
  );
  if (!saved) {
    // la nota c'era: è cambiata dopo il caricamento (o è stata eliminata)
    const still = await clientNotesRepository.getNote(note.id);
    return { ok: false, reason: still ? "conflict" : "not_found" };
  }
  return {
    ok: true,
    data: {
      clientId: note.client_id,
      title: saved.title,
      visitDate: saved.visit_date,
      updatedAt: saved.updated_at,
    },
  };
}

/** Elimina una nota di visita; l'anamnesi resta. */
export async function deleteNote(
  studioId: string,
  noteId: string,
): Promise<Result<{ clientId: string }>> {
  const note = await loadOwnedNote(studioId, noteId);
  if (!note) return { ok: false, reason: "not_found" };
  if (note.kind === "anamnesis") return { ok: false, reason: "anamnesis" };
  await clientNotesRepository.deleteNote(note.id);
  return { ok: true, data: { clientId: note.client_id } };
}
