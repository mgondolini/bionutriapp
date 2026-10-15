"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { safeNextPath } from "@/lib/auth/route-decision";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import * as authService from "@/server/services/auth.service";
import { homeForSession, routeRoleOf } from "@/server/services/session.service";
import {
  loginSchema,
  newPasswordSchema,
  recoverPasswordSchema,
  type LoginInput,
  type NewPasswordInput,
  type RecoverPasswordInput,
} from "@/server/validation/auth.schema";
import { fail, ok, type ActionResult } from "@/types/action-result";

/**
 * Login: in caso di successo reindirizza all'area del ruolo (o al percorso
 * `next`, se appartiene a quell'area), altrimenti restituisce un errore generico.
 */
export async function loginAction(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      copy.common.invalidInput,
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const session = await authService.signIn(
    parsed.data.identifier,
    parsed.data.password,
  );
  if (!session) return fail(copy.auth.login.invalidCredentials);

  redirect(
    safeNextPath(parsed.data.next, routeRoleOf(session)) ??
      homeForSession(session),
  );
}

export async function logoutAction(): Promise<void> {
  await authService.signOut();
  redirect(ROUTES.login);
}

/** Restituisce sempre successo, qualunque sia l'esito: non rivela se l'email esiste. */
export async function requestPasswordResetAction(
  input: RecoverPasswordInput,
): Promise<ActionResult> {
  const parsed = recoverPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      copy.common.invalidInput,
      z.flattenError(parsed.error).fieldErrors,
    );
  }
  await authService.requestPasswordReset(parsed.data.email);
  return ok();
}

export async function setNewPasswordAction(
  input: NewPasswordInput,
): Promise<ActionResult> {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      copy.common.invalidInput,
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const session = await authService.setNewPassword(
    parsed.data.password,
    parsed.data.tokenHash ?? null,
  );
  if (!session) return fail(copy.auth.newPassword.invalidLink);

  redirect(homeForSession(session));
}
