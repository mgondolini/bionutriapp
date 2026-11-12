import "server-only";

import type { NoteDoc } from "@/lib/domain/client-notes/content";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

/*
 * Note cliniche (migrazione 20261116000000_note_cliniche.sql). Sempre con
 * il client dell'utente: la RLS limita allo staff dello studio, i trigger
 * ricavano studio, autore e updated_at e impediscono di eliminare
 * l'anamnesi.
 */

const LIST_COLUMNS =
  "id, kind, title, visit_date, content_text, created_at, updated_at";
const NOTE_COLUMNS = `${LIST_COLUMNS}, studio_id, client_id, content`;

/** Note del cliente senza il contenuto (l'elenco mostra solo l'anteprima). */
export async function listNotes(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_notes")
    .select(LIST_COLUMNS)
    .eq("client_id", clientId);
  if (error) throw error;
  return data;
}

export async function getNote(noteId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_notes")
    .select(NOTE_COLUMNS)
    .eq("id", noteId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type NewNoteRow = {
  /** Lo riscrive comunque il trigger dal cliente. */
  studioId: string;
  clientId: string;
  kind: "anamnesis" | "visit";
  title: string;
  visitDate: string | null;
  content: NoteDoc;
  contentText: string;
};

/** Nuova nota; null se esiste già l'anamnesi (indice unico, 23505). */
export async function insertNote(row: NewNoteRow) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_notes")
    .insert({
      studio_id: row.studioId,
      client_id: row.clientId,
      kind: row.kind,
      title: row.title,
      visit_date: row.visitDate,
      content: row.content as unknown as NonNullable<Json>,
      content_text: row.contentText,
    })
    .select("id")
    .single();
  if (error?.code === "23505") return null;
  if (error) throw error;
  return data;
}

/**
 * Aggiorna titolo, data e contenuto. Con `expectedUpdatedAt` solo se la
 * nota è ancora alla versione caricata: null se nel frattempo è cambiata
 * (o non esiste più). Il controllo e la scrittura sono un'unica UPDATE.
 */
export async function updateNote(
  noteId: string,
  values: {
    title: string;
    visitDate: string | null;
    content: NoteDoc;
    contentText: string;
  },
  expectedUpdatedAt: string | null,
) {
  const supabase = await createClient();
  let query = supabase
    .from("client_notes")
    .update({
      title: values.title,
      visit_date: values.visitDate,
      content: values.content as unknown as NonNullable<Json>,
      content_text: values.contentText,
    })
    .eq("id", noteId);
  if (expectedUpdatedAt) query = query.eq("updated_at", expectedUpdatedAt);
  const { data, error } = await query
    .select("id, title, visit_date, updated_at")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteNote(noteId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_notes")
    .delete()
    .eq("id", noteId);
  if (error) throw error;
}
