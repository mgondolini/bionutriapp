// Schemi Zod condivisi tra form (client) e Server Actions: niente "server-only".
import { z } from "zod";

import {
  FILE_CATEGORIES,
  FILE_EXTENSION,
  FILE_MAX_BYTES,
  FILE_MIME_TYPE,
  FILE_NAME_MAX,
  FILE_NOTE_MAX,
  FILE_OPEN_MODES,
  FILE_TITLE_MAX,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

const v = copy.files.validation;
const e = copy.files.uploadErrors;

/** Dati del file scelti nel form (A-08): uguali nel browser e sul server. */
export const fileFormSchema = z.object({
  category: z.enum(FILE_CATEGORIES, v.categoryRequired),
  title: z
    .string()
    .trim()
    .min(1, v.titleRequired)
    .max(FILE_TITLE_MAX, v.titleTooLong),
  validFrom: z.iso.date(v.validFromInvalid),
  /** Testo semplice, mostrato senza interpretare HTML. Vuota = nessuna nota. */
  note: z
    .string()
    .trim()
    .max(FILE_NOTE_MAX, v.noteTooLong)
    .transform((value) => value || null),
  notify: z.boolean(),
});
export type FileFormValues = z.input<typeof fileFormSchema>;

const clientId = z.uuid();

/**
 * Primo passaggio del caricamento: metadati e file DICHIARATI dal browser.
 * Il server li ricontrolla sull'oggetto reale alla conferma.
 */
export const prepareUploadSchema = fileFormSchema.extend({
  clientId,
  fileName: z
    .string()
    .min(1, e.not_pdf)
    .max(FILE_NAME_MAX, e.not_pdf)
    .refine((name) => name.toLowerCase().endsWith(FILE_EXTENSION), e.not_pdf),
  // alcuni sistemi non conoscono il tipo: vuoto è ammesso, decidono estensione e primi byte
  fileType: z
    .string()
    .refine((type) => type === "" || type === FILE_MIME_TYPE, e.not_pdf),
  fileSize: z.number().int().min(1, e.empty).max(FILE_MAX_BYTES, e.too_large),
});
export type PrepareUploadInput = z.input<typeof prepareUploadSchema>;

/** Terzo passaggio: dal browser arriva solo l'id del file, il percorso lo ricostruisce il server. */
export const confirmUploadSchema = fileFormSchema.extend({
  clientId,
  fileId: z.uuid(),
});
export type ConfirmUploadInput = z.input<typeof confirmUploadSchema>;
export type ConfirmUploadData = z.output<typeof confirmUploadSchema>;

export const openFileSchema = z.object({
  fileId: z.uuid(),
  mode: z.enum(FILE_OPEN_MODES),
});
export type OpenFileInput = z.input<typeof openFileSchema>;

export const fileIdSchema = z.object({ fileId: z.uuid() });
export type FileIdInput = z.input<typeof fileIdSchema>;

/** Filtro per categoria nell'URL della scheda File: un valore non valido vale "tutte". */
export const fileCategoryParamSchema = z
  .enum(FILE_CATEGORIES)
  .nullable()
  .catch(null);
