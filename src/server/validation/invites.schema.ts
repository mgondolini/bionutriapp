// Schemi Zod condivisi tra form (client) e Server Actions: niente "server-only".
import { z } from "zod";

import { INVITE_TOKEN_LENGTH } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { parseBirthDate } from "@/lib/csv/clean-clients";
import { requiredHeight } from "@/server/validation/height.schema";
import { passwordSchema } from "@/server/validation/password.schema";

const v = copy.activation.validation;

/** Token del link: solo la forma; la validità la decide il server con l'hash. */
export const inviteTokenSchema = z
  .string()
  .length(INVITE_TOKEN_LENGTH)
  .regex(/^[A-Za-z0-9_-]+$/);

/** Email obbligatoria: serve per accedere e per recuperare la password da soli. */
const requiredEmail = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, v.emailRequired)
  .pipe(z.email(v.emailInvalid));

const optionalBirthDate = z
  .string()
  .trim()
  .refine(
    (value) => !value || parseBirthDate(value) !== null,
    v.birthDateInvalid,
  )
  .transform((value) => (value ? parseBirthDate(value) : null));

/**
 * Attivazione (C-08), schermate C1 e C2: stesso schema per i due percorsi.
 * Cognome, email e altezza sono obbligatori: il cliente nuovo li inserisce
 * qui, quello già presente li verifica. Il cellulare non si modifica (identifica l'invito).
 */
export const activationSchema = z.object({
  token: inviteTokenSchema,
  firstName: z
    .string()
    .trim()
    .min(1, v.firstNameRequired)
    .max(80, v.nameTooLong),
  lastName: z.string().trim().min(1, v.lastNameRequired).max(80, v.nameTooLong),
  email: requiredEmail,
  birthDate: optionalBirthDate,
  heightCm: requiredHeight,
  password: passwordSchema,
  // Due dichiarazioni distinte (NF-06): presa visione dell'informativa e
  // consenso esplicito al trattamento dei dati sanitari (art. 9 GDPR).
  privacyNotice: z.literal(true, { error: v.privacyNoticeRequired }),
  healthData: z.literal(true, { error: v.healthDataRequired }),
});
export type ActivationInput = z.output<typeof activationSchema>;

/** Valori del form di attivazione (prima della trasformazione). */
export type ActivationFormValues = {
  token: string;
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  heightCm: string;
  password: string;
  privacyNotice: boolean;
  healthData: boolean;
};

/** Nuovo link a un cliente già attivo (N-02): solo la nuova password. */
export const resetViaInviteSchema = z.object({
  token: inviteTokenSchema,
  password: passwordSchema,
});
export type ResetViaInviteInput = z.infer<typeof resetViaInviteSchema>;
