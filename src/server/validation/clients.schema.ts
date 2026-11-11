// Schemi Zod condivisi tra form (client) e Server Actions: niente "server-only".
import { z } from "zod";

import {
  ACCOUNT_STATUSES,
  CLIENT_LIST_PARAMS,
  CLIENT_SEARCH_MAX_LENGTH,
  CSV_MAX_BYTES,
  CREATION_STAGES,
  JOURNEY_STAGES,
  type CreationStage,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { parseBirthDate } from "@/lib/csv/clean-clients";
import { normalizePhone } from "@/lib/phone";
import { optionalHeight } from "@/server/validation/height.schema";
import { firstValue, pageParamSchema } from "@/server/validation/page.schema";

const v = copy.admin.clients.validation;

const firstName = z
  .string()
  .trim()
  .min(1, v.firstNameRequired)
  .max(80, v.nameTooLong);
const lastName = z
  .string()
  .trim()
  .min(1, v.lastNameRequired)
  .max(80, v.nameTooLong);

/** Cellulare obbligatorio, restituito in E.164 (paese predefinito Italia). */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, v.phoneRequired)
  .refine((value) => normalizePhone(value) !== null, v.phoneInvalid)
  .transform((value) => normalizePhone(value)!);

/** Email facoltativa: stringa vuota = nessuna email; salvata in minuscolo. */
const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.union([z.literal(""), z.email(v.emailInvalid)]))
  .transform((value) => value || null);

/** Data di nascita facoltativa ("YYYY-MM-DD" dal campo data), non futura. */
const optionalBirthDate = z
  .string()
  .trim()
  .refine(
    (value) => !value || parseBirthDate(value) !== null,
    v.birthDateInvalid,
  )
  .transform((value) => (value ? parseBirthDate(value) : null));

/** Fase scelta alla creazione o all'import: In percorso o Onboarding. */
const creationStage = z.enum(CREATION_STAGES, v.stageRequired);

/** "Nuovo cliente" (A-04): dati completi e fase iniziale scelta dallo staff. */
export const createClientSchema = z.object({
  stage: creationStage,
  firstName,
  lastName,
  phone: phoneSchema,
  email: optionalEmail,
  birthDate: optionalBirthDate,
});
export type CreateClientInput = z.output<typeof createClientSchema>;

/** Valori del form "Nuovo cliente" (stringhe come le digita lo staff). */
export type CreateClientFormValues = {
  stage: CreationStage;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  birthDate: string;
};

/** Filtri, ricerca e pagina dell'elenco dall'URL; i valori non validi vengono ignorati. */
export const clientListParamsSchema = z
  .object({
    [CLIENT_LIST_PARAMS.status]: z
      .preprocess(firstValue, z.enum(ACCOUNT_STATUSES).optional())
      .catch(undefined),
    [CLIENT_LIST_PARAMS.stage]: z
      .preprocess(firstValue, z.enum(JOURNEY_STAGES).optional())
      .catch(undefined),
    [CLIENT_LIST_PARAMS.query]: z
      .preprocess(
        firstValue,
        z.string().trim().max(CLIENT_SEARCH_MAX_LENGTH).optional(),
      )
      .catch(undefined),
    [CLIENT_LIST_PARAMS.page]: pageParamSchema,
  })
  .transform((params) => ({
    filters: {
      status: params[CLIENT_LIST_PARAMS.status],
      stage: params[CLIENT_LIST_PARAMS.stage],
      query: params[CLIENT_LIST_PARAMS.query] || undefined,
    },
    page: params[CLIENT_LIST_PARAMS.page],
  }));

/** Il CSV arriva alla Server Action come testo (massimo 1 MB). */
export const csvImportSchema = z.object({
  /** Una fase per tutte le righe del file. */
  stage: creationStage,
  csv: z
    .string()
    .refine(
      (text) => new TextEncoder().encode(text).length <= CSV_MAX_BYTES,
      copy.admin.clients.import.fileErrors.too_large,
    ),
});
export type CsvImportInput = z.infer<typeof csvImportSchema>;

export const clientIdSchema = z.uuid();

export const sendInviteSchema = z.object({ clientId: clientIdSchema });
export type SendInviteInput = z.infer<typeof sendInviteSchema>;

/** Cognome facoltativo nella modifica (i clienti nuovi non ce l'hanno finché non si attivano). */
const optionalLastName = z
  .string()
  .trim()
  .max(80, v.nameTooLong)
  .transform((value) => value || null);

/** Modifica dei dati anagrafici dalla scheda Profilo (A-06). */
export const updateClientSchema = z.object({
  clientId: clientIdSchema,
  firstName,
  lastName: optionalLastName,
  phone: phoneSchema,
  email: optionalEmail,
  birthDate: optionalBirthDate,
  heightCm: optionalHeight,
});
export type UpdateClientInput = z.output<typeof updateClientSchema>;
export type UpdateClientFormValues = z.input<typeof updateClientSchema>;

/** Cambio di fase: la fase di partenza serve a non sovrascrivere un cambio concorrente. */
export const changeStageSchema = z.object({
  clientId: clientIdSchema,
  from: z.enum(JOURNEY_STAGES),
  to: z.enum(JOURNEY_STAGES),
});
export type ChangeStageInput = z.infer<typeof changeStageSchema>;

export const clientAccountSchema = z.object({ clientId: clientIdSchema });
export type ClientAccountInput = z.infer<typeof clientAccountSchema>;
