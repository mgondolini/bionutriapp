"use server";

import { redirect, RedirectType } from "next/navigation";
import { z } from "zod";

import { loginUrl, safeNextPath } from "@/lib/auth/route-decision";
import { copy } from "@/lib/copy/it";
import * as authService from "@/server/services/auth.service";
import {
  getSession,
  homeForSession,
  routeRoleOf,
} from "@/server/services/session.service";
import {
  loginSchema,
  newPasswordSchema,
  recoverPasswordSchema,
  signOutSchema,
  type LoginInput,
  type NewPasswordInput,
  type RecoverPasswordInput,
  type SignOutInput,
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

/**
 * "Esci" ed "Esci da tutti i dispositivi" (fase 7), chiamata dal browser:
 * elimina le sottoscrizioni push e chiude la sessione. Il browser poi fa una
 * navigazione completa con `replace` verso il login ("Sei uscito dall'app"),
 * che azzera lo stato della pagina e la cache del router.
 */
export async function signOutAction(
  input: SignOutInput,
): Promise<ActionResult> {
  const parsed = signOutSchema.safeParse(input);
  const scope = parsed.success ? parsed.data.scope : "local";
  const endpoint = parsed.success ? parsed.data.endpoint : null;
  const session = await getSession();
  const userId = session.kind === "anonymous" ? null : session.userId;
  await authService.signOut(scope, endpoint, userId);
  return ok();
}

/** "Esci" senza JavaScript (form): stessa uscita, poi redirect al login. */
export async function logoutAction(): Promise<void> {
  const session = await getSession();
  await authService.signOut(
    "local",
    null,
    session.kind === "anonymous" ? null : session.userId,
  );
  redirect(loginUrl({ reason: "loggedOut" }), RedirectType.replace);
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
