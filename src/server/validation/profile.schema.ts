// Schemi Zod condivisi tra form (client) e Server Actions: niente "server-only".
// Profilo del cliente (C-07) e del professionista: l'id dell'utente non è mai
// nel form, lo ricava la Server Action dalla sessione.
import { z } from "zod";

import {
  CLIENT_EDITABLE_FIELDS,
  NAME_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  type ClientEditableField,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { parseBirthDate } from "@/lib/csv/clean-clients";
import { passwordSchema } from "@/server/validation/password.schema";

const v = copy.profile.validation;

const requiredName = (message: string) =>
  z.string().trim().min(1, message).max(NAME_MAX_LENGTH, v.nameTooLong);

/** Testo facoltativo: vuoto = null. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || null);

/** Data dal campo `type="date"` (o gg/mm/aaaa): reale, non futura, dal 1900. */
const optionalBirthDate = z
  .string()
  .trim()
  .refine(
    (value) => !value || parseBirthDate(value) !== null,
    v.birthDateInvalid,
  )
  .transform((value) => (value ? parseBirthDate(value) : null));

/** Dati personali del cliente: solo i campi di CLIENT_EDITABLE_FIELDS. */
export const clientProfileSchema = z.object({
  firstName: requiredName(v.firstNameRequired),
  lastName: requiredName(v.lastNameRequired),
  birthDate: optionalBirthDate,
});
export type ClientProfileInput = z.output<typeof clientProfileSchema>;
export type ClientProfileFormValues = z.input<typeof clientProfileSchema>;

/** Valori validati → colonne di `clients` (le sole che il cliente può toccare). */
export function toClientProfileUpdate(
  input: ClientProfileInput,
): Record<ClientEditableField, string | null> {
  const update = {
    first_name: input.firstName,
    last_name: input.lastName,
    birth_date: input.birthDate,
  } satisfies Record<ClientEditableField, string | null>;
  // garanzia a runtime: nessuna colonna fuori dall'elenco
  return Object.fromEntries(
    CLIENT_EDITABLE_FIELDS.map((field) => [field, update[field]]),
  ) as Record<ClientEditableField, string | null>;
}

/** Nome del professionista: titolo facoltativo ("Dott.ssa"), nome, cognome. */
export const staffProfileSchema = z.object({
  title: optionalText(TITLE_MAX_LENGTH, v.titleTooLong),
  firstName: requiredName(v.firstNameRequired),
  lastName: optionalText(NAME_MAX_LENGTH, v.nameTooLong),
});
export type StaffProfileInput = z.output<typeof staffProfileSchema>;
export type StaffProfileFormValues = z.input<typeof staffProfileSchema>;

/** Nuovo indirizzo email: la conferma arriva via email (cambio sicuro di Supabase). */
export const emailChangeSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, v.emailRequired)
    .pipe(z.email(v.emailInvalid)),
});
export type EmailChangeInput = z.output<typeof emailChangeSchema>;
export type EmailChangeFormValues = z.input<typeof emailChangeSchema>;

/** Cambio password: l'attuale si verifica sul server con una nuova autenticazione. */
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, v.currentPasswordRequired),
    password: passwordSchema,
    confirm: z.string().min(1, v.confirmRequired),
  })
  .refine((data) => data.password === data.confirm, {
    message: copy.auth.validation.passwordMismatch,
    path: ["confirm"],
  })
  .refine((data) => data.password !== data.currentPassword, {
    message: v.samePassword,
    path: ["password"],
  });
export type ChangePasswordInput = z.output<typeof changePasswordSchema>;

/** Preferenza delle notifiche push (C-07): il Web Push arriva nella fase 8. */
/** Link di conferma della nuova email: solo la forma, la validità la decide Supabase. */
export const confirmEmailSchema = z.object({
  tokenHash: z.string().trim().min(1).max(200),
});
export type ConfirmEmailInput = z.output<typeof confirmEmailSchema>;
