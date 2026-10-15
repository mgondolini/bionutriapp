// Schemi Zod condivisi tra form (client) e Server Actions: niente "server-only".
import { z } from "zod";

import { PASSWORD_MIN_LENGTH } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

const v = copy.auth.validation;

/**
 * Login: il campo si chiama `identifier` perché nella fase 4 accetterà anche
 * il cellulare; oggi è un'email.
 */
export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, v.identifierRequired)
    .pipe(z.email(v.emailInvalid)),
  password: z.string().min(1, v.passwordRequired),
  next: z.string().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const recoverPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, v.identifierRequired)
    .pipe(z.email(v.emailInvalid)),
});
export type RecoverPasswordInput = z.infer<typeof recoverPasswordSchema>;

export const newPasswordSchema = z
  .object({
    password: z.string().min(PASSWORD_MIN_LENGTH, v.passwordTooShort),
    confirm: z.string().min(1, v.passwordRequired),
    tokenHash: z.string().trim().min(1).max(200).optional(),
  })
  .refine((data) => data.password === data.confirm, {
    message: v.passwordMismatch,
    path: ["confirm"],
  });
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;
