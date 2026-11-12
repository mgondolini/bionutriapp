"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { NOTE_SAVE_CONFLICT, clientNotesPath } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { authFailure } from "@/server/actions/session-guard";
import * as clientNotesService from "@/server/services/client-notes.service";
import type { NoteFailure } from "@/server/services/client-notes.service";
import { getStaffSession } from "@/server/services/session.service";
import {
  clientIdInputSchema,
  noteIdSchema,
  saveNoteSchema,
  type ClientIdInput,
  type NoteIdInput,
  type SaveNoteInput,
} from "@/server/validation/client-notes.schema";
import { fail, ok, type ActionResult } from "@/types/action-result";

const e = copy.clientNotes.errors;

const FAILURES: Record<NoteFailure, string> = {
  not_found: e.notFound,
  // codice, non testo: l'editor mostra "Ricarica" e "Sovrascrivi comunque"
  conflict: NOTE_SAVE_CONFLICT,
  anamnesis: e.anamnesis,
};

/** Elenco e note della scheda (solo staff: nessuna pagina del cliente). */
function revalidateNotes(clientId: string) {
  revalidatePath(clientNotesPath(clientId), "layout");
}

function invalid(error: z.ZodError): ActionResult<never> {
  const fieldErrors = z.flattenError(error).fieldErrors as Record<
    string,
    string[] | undefined
  >;
  const first = Object.values(fieldErrors).find((messages) => messages?.length);
  return fail(
    first?.[0] ?? copy.common.invalidInput,
    Object.fromEntries(
      Object.entries(fieldErrors).filter(([, messages]) => messages?.length),
    ) as Record<string, string[]>,
  );
}

/** "Nuova nota": restituisce l'id per aprirla. */
export async function createVisitNoteAction(
  input: ClientIdInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await getStaffSession();
  if (!session) return authFailure();
  const parsed = clientIdInputSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await clientNotesService.createVisitNote(
    session.studio.id,
    parsed.data.clientId,
  );
  if (!result.ok) return fail(FAILURES[result.reason]);
  revalidateNotes(parsed.data.clientId);
  return ok(result.data);
}

/**
 * "Salva": restituisce la nuova versione (updatedAt) per il salvataggio
 * successivo; `error === NOTE_SAVE_CONFLICT` se la nota è cambiata altrove.
 */
export async function saveNoteAction(input: SaveNoteInput): Promise<
  ActionResult<{
    title: string;
    visitDate: string | null;
    updatedAt: string;
  }>
> {
  const session = await getStaffSession();
  if (!session) return authFailure();
  const parsed = saveNoteSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await clientNotesService.saveNote(
    session.studio.id,
    parsed.data,
  );
  if (!result.ok) return fail(FAILURES[result.reason]);
  const { clientId, ...data } = result.data;
  revalidateNotes(clientId);
  return ok(data);
}

export async function deleteNoteAction(
  input: NoteIdInput,
): Promise<ActionResult<{ clientId: string }>> {
  const session = await getStaffSession();
  if (!session) return authFailure();
  const parsed = noteIdSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await clientNotesService.deleteNote(
    session.studio.id,
    parsed.data.noteId,
  );
  if (!result.ok) return fail(FAILURES[result.reason]);
  revalidateNotes(result.data.clientId);
  return ok(result.data);
}
