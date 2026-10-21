// Schemi Zod condivisi tra form (client) e Server Actions: niente "server-only".
import { z } from "zod";

import {
  looksLikeEmail,
  parseLoginIdentifier,
} from "@/lib/auth/login-identifier";
import { copy } from "@/lib/copy/it";
import { passwordSchema } from "@/server/validation/password.schema";

const v = copy.auth.validation;

/** Login con email o cellulare (N-02): l'identificativo si interpreta sul server. */
export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, v.identifierRequired)
    .refine(
      (value) => parseLoginIdentifier(value) !== null,
      v.identifierInvalid,
    ),
  password: z.string().min(1, v.passwordRequired),
  next: z.string().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Recupero via email: vale solo per chi ha un'email. Se viene digitato un
 * cellulare si indica di chiedere allo studio un nuovo link (N-02).
 */
export const recoverPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, v.emailRequired)
    .superRefine((value, ctx) => {
      if (z.email().safeParse(value).success) return;
      const isPhone =
        !looksLikeEmail(value) && parseLoginIdentifier(value) !== null;
      ctx.addIssue({
        code: "custom",
        message: isPhone ? copy.auth.recover.phoneEntered : v.emailInvalid,
      });
    }),
});
export type RecoverPasswordInput = z.infer<typeof recoverPasswordSchema>;

export const newPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string().min(1, v.passwordRequired),
    tokenHash: z.string().trim().min(1).max(200).optional(),
  })
  .refine((data) => data.password === data.confirm, {
    message: v.passwordMismatch,
    path: ["confirm"],
  });
export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

/**
 * Uscita (fase 7): `local` = questo dispositivo, `global` = tutti. L'endpoint
 * è quello della sottoscrizione push del browser (fase 8), da eliminare.
 */
export const signOutSchema = z.object({
  scope: z.enum(["local", "global"]),
  endpoint: z.url().max(2048).nullable(),
});
export type SignOutInput = z.infer<typeof signOutSchema>;
