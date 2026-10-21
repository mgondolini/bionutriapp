"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import * as profileService from "@/server/services/profile.service";
import {
  getSession,
  getStaffSession,
  type Session,
} from "@/server/services/session.service";
import {
  changePasswordSchema,
  clientProfileSchema,
  confirmEmailSchema,
  emailChangeSchema,
  pushPreferenceSchema,
  staffProfileSchema,
  type ClientProfileFormValues,
  type ConfirmEmailInput,
  type EmailChangeFormValues,
  type PushPreferenceInput,
  type StaffProfileFormValues,
} from "@/server/validation/profile.schema";
import { fail, ok, type ActionResult } from "@/types/action-result";
import { authFailure } from "@/server/actions/session-guard";

const t = copy.profile;

/*
 * Profilo (C-07): ogni azione modifica SOLO l'utente della sessione. Nessun
 * id arriva dal form; la RLS e i trigger ricontrollano.
 */

type SignedIn = Extract<Session, { kind: "staff" | "client" }>;

/** Staff o cliente attivo (anche in Onboarding: il profilo non è bloccato). */
async function signedInSession(): Promise<SignedIn | null> {
  const session = await getSession();
  return session.kind === "staff" || session.kind === "client" ? session : null;
}

function validationFailure(error: z.ZodError): ActionResult<never> {
  return fail(copy.common.invalidInput, z.flattenError(error).fieldErrors);
}

/** Nome, cognome e data di nascita del cliente (CLIENT_EDITABLE_FIELDS). */
export async function updateClientProfileAction(
  input: ClientProfileFormValues,
): Promise<ActionResult> {
  const session = await getSession();
  if (session.kind !== "client") return authFailure();

  const parsed = clientProfileSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  if (!(await profileService.updateClientProfile(parsed.data))) {
    return authFailure();
  }
  // il nome compare anche nel saluto dell'intestazione
  revalidatePath(ROUTES.client.home, "layout");
  return ok();
}

/** Titolo, nome e cognome del professionista (compaiono nella sidebar). */
export async function updateStaffProfileAction(
  input: StaffProfileFormValues,
): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return authFailure();

  const parsed = staffProfileSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  if (!(await profileService.updateStaffProfile(parsed.data))) {
    return authFailure();
  }
  revalidatePath(ROUTES.admin.home, "layout");
  return ok();
}

/** Cambio o aggiunta dell'email, con conferma inviata via email. */
export async function requestEmailChangeAction(
  input: EmailChangeFormValues,
): Promise<ActionResult<{ email: string; confirmBoth: boolean }>> {
  const session = await signedInSession();
  if (!session) return authFailure();

  const parsed = emailChangeSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const result = await profileService.requestEmailChange(parsed.data.email, {
    isClient: session.kind === "client",
  });
  if (!result.ok) {
    const message = {
      same: t.email.sameAsCurrent,
      unavailable: t.email.unavailable,
      failed: t.email.failed,
    }[result.reason];
    return fail(message, { email: [message] });
  }
  revalidatePath(
    session.kind === "client" ? ROUTES.client.profile : ROUTES.admin.profile,
  );
  return ok({ email: result.email, confirmBoth: result.confirmBoth });
}

/**
 * Conferma del nuovo indirizzo dal link dell'email: pagina pubblica, si
 * autorizza con il token. Verificato solo al clic (le anteprime dei client
 * di posta non consumano il link).
 */
export async function confirmEmailChangeAction(
  input: ConfirmEmailInput,
): Promise<ActionResult<{ completed: boolean }>> {
  const parsed = confirmEmailSchema.safeParse(input);
  if (!parsed.success) return fail(t.confirmEmail.invalidLink);

  const outcome = await profileService.confirmEmailChange(
    parsed.data.tokenHash,
  );
  if (outcome === "invalid") return fail(t.confirmEmail.invalidLink);
  return ok({ completed: outcome === "done" });
}

/** Cambio password (cliente e professionista): le altre sessioni vengono chiuse. */
export async function changePasswordAction(
  input: z.input<typeof changePasswordSchema>,
): Promise<ActionResult> {
  const session = await signedInSession();
  if (!session) return authFailure();

  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return validationFailure(parsed.error);

  const changed = await profileService.changePassword(
    parsed.data.currentPassword,
    parsed.data.password,
  );
  return changed ? ok() : fail(t.password.failed);
}

/** Preferenza delle notifiche push (solo push_enabled; Web Push nella fase 8). */
export async function setPushPreferenceAction(
  input: PushPreferenceInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (session.kind !== "client") return authFailure();

  const parsed = pushPreferenceSchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);

  if (
    !(await profileService.setPushPreference(
      session.client.id,
      parsed.data.enabled,
    ))
  ) {
    return authFailure();
  }
  revalidatePath(ROUTES.client.profile);
  return ok();
}
