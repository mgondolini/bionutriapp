// Schemi Zod condivisi tra form (client) e Server Actions: niente "server-only".
import { z } from "zod";

import {
  ACCOUNT_STATUSES,
  CLIENT_LIST_PARAMS,
  CLIENT_SEARCH_MAX_LENGTH,
  CSV_MAX_BYTES,
  JOURNEY_STAGES,
  type ClientCreationMode,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { parseBirthDate } from "@/lib/csv/clean-clients";
import { normalizePhone } from "@/lib/phone";

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

/** "Nuovo cliente": solo nome e cellulare → origine 'new', fase Onboarding. */
export const newClientSchema = z.object({
  mode: z.literal("new"),
  firstName,
  phone: phoneSchema,
});

/** "Con dati completi" → origine 'imported', fase In percorso. */
export const fullClientSchema = z.object({
  mode: z.literal("full"),
  firstName,
  lastName,
  phone: phoneSchema,
  email: optionalEmail,
  birthDate: optionalBirthDate,
});

export const createClientSchema = z.discriminatedUnion("mode", [
  newClientSchema,
  fullClientSchema,
]);
export type CreateClientInput = z.output<typeof createClientSchema>;

/**
 * Valori del form "Nuovo cliente": tutti i campi, qualunque sia la modalità.
 * Lo schema sceglie la variante in base a `mode` e scarta i campi dell'altra.
 */
export type CreateClientFormValues = {
  mode: ClientCreationMode;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  birthDate: string;
};

/** Primo valore di un parametro dell'URL (searchParams può contenere array). */
const firstValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

/** Filtri e ricerca dell'elenco dall'URL; i valori non validi vengono ignorati. */
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
  })
  .transform((params) => ({
    status: params[CLIENT_LIST_PARAMS.status],
    stage: params[CLIENT_LIST_PARAMS.stage],
    query: params[CLIENT_LIST_PARAMS.query] || undefined,
  }));

/** Il CSV arriva alla Server Action come testo (massimo 1 MB). */
export const csvImportSchema = z.object({
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
