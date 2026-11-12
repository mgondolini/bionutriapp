/**
 * Note cliniche: input delle Server Actions e dei campi dell'editor,
 * condivisi tra browser e server (DEV-09). Il contenuto arriva come JSON di
 * Tiptap e viene ricostruito con i soli elementi dell'editor
 * (sanitizeNoteDoc): quello che si salva non è mai il JSON del browser.
 */
import { z } from "zod";

import {
  CLIENT_NOTE_CONTENT_MAX_BYTES,
  CLIENT_NOTE_TITLE_MAX,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import {
  noteDocBytes,
  sanitizeNoteDoc,
  type NoteDoc,
} from "@/lib/domain/client-notes/content";
import { todayInRome } from "@/lib/domain/tracking/dates";

const e = copy.clientNotes.errors;

export const noteTitleSchema = z
  .string()
  .trim()
  .min(1, e.titleRequired)
  .max(CLIENT_NOTE_TITLE_MAX, e.titleTooLong);

/** Giorno della visita, non futuro (a Roma). */
export const visitDateSchema = z.iso
  .date(e.dateRequired)
  .refine((day) => day <= todayInRome(), e.dateFuture);

/**
 * Il documento arriva come stringa JSON: un oggetto passato direttamente a
 * una Server Action perde gli `attrs` condivisi fra più nodi (ProseMirror
 * riusa lo stesso oggetto, es. tutti i titoli h2), e con la stringa la
 * dimensione si controlla prima di analizzarla.
 */
export const noteContentSchema = z
  .string()
  .transform((value, ctx): NoteDoc => {
    if (noteDocBytes(value) > CLIENT_NOTE_CONTENT_MAX_BYTES) {
      ctx.addIssue({ code: "custom", message: e.contentTooLarge });
      return z.NEVER;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = null;
    }
    const doc = sanitizeNoteDoc(parsed);
    if (!doc) {
      ctx.addIssue({ code: "custom", message: e.contentInvalid });
      return z.NEVER;
    }
    return doc;
  });

export const clientIdInputSchema = z.object({ clientId: z.uuid() });
export type ClientIdInput = z.input<typeof clientIdInputSchema>;

export const noteIdSchema = z.object({ noteId: z.uuid() });
export type NoteIdInput = z.input<typeof noteIdSchema>;

/**
 * Salvataggio: `expectedUpdatedAt` è la versione caricata; se nel database
 * è cambiata la nota non si sovrascrive, salvo `force` ("Sovrascrivi
 * comunque"). `visitDate` vale solo per le note di visita.
 */
export const saveNoteSchema = z.object({
  noteId: z.uuid(),
  title: noteTitleSchema,
  visitDate: visitDateSchema.nullable(),
  content: noteContentSchema,
  expectedUpdatedAt: z.string().min(1).max(64),
  force: z.boolean().default(false),
});
export type SaveNoteInput = z.input<typeof saveNoteSchema>;
export type SaveNoteValues = z.output<typeof saveNoteSchema>;
