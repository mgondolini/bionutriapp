"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import * as invitesService from "@/server/services/invites.service";
import { getStaffSession } from "@/server/services/session.service";
import {
  sendInviteSchema,
  type SendInviteInput,
} from "@/server/validation/clients.schema";
import {
  activationSchema,
  resetViaInviteSchema,
  type ActivationFormValues,
  type ResetViaInviteInput,
} from "@/server/validation/invites.schema";
import { fail, ok, type ActionResult } from "@/types/action-result";

const t = copy.activation;

/**
 * Invito su WhatsApp (N-01, A-07): nuovo link monouso, revoca dei precedenti,
 * data di invio registrata. Restituisce l'indirizzo wa.me che il browser apre
 * nella finestra già aperta al clic. Il token non compare nei log.
 */
export async function sendWhatsAppInviteAction(
  input: SendInviteInput,
): Promise<
  ActionResult<{ whatsappUrl: string; sentAt: string; expiresAt: string }>
> {
  const session = await getStaffSession();
  if (!session) return fail(copy.common.unauthorized);

  const parsed = sendInviteSchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);

  const result = await invitesService.createInvite({
    clientId: parsed.data.clientId,
    studioId: session.studio.id,
    studioName: session.studio.name,
  });
  if (!result.ok) {
    return fail(
      result.reason === "disabled"
        ? copy.admin.clients.invite.disabled
        : copy.admin.clients.detail.notFoundDescription,
    );
  }

  revalidatePath(ROUTES.admin.clients, "layout");
  return ok({
    whatsappUrl: result.whatsappUrl,
    sentAt: result.sentAt,
    expiresAt: result.expiresAt,
  });
}

/**
 * Attivazione dal link (C-08). Azione pubblica: l'autorizzazione è il token,
 * verificato sul server tramite il suo hash. In caso di successo il cliente è
 * già autenticato e va in /app.
 */
export async function activateAccountAction(
  input: ActivationFormValues,
): Promise<ActionResult> {
  const parsed = activationSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      copy.common.invalidInput,
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const result = await invitesService.activate(parsed.data);
  if (!result.ok) {
    if (result.reason === "duplicate_email") {
      return fail(t.duplicateEmail, { email: [t.duplicateEmail] });
    }
    return fail(result.reason === "invalid" ? t.invalid : t.failed);
  }
  redirect(result.signedIn ? ROUTES.client.home : ROUTES.login);
}

/** Nuovo link per un cliente già attivo (N-02): nuova password e accesso. */
export async function resetPasswordViaInviteAction(
  input: ResetViaInviteInput,
): Promise<ActionResult> {
  const parsed = resetViaInviteSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      copy.common.invalidInput,
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const result = await invitesService.resetPasswordViaInvite(parsed.data);
  if (!result.ok) {
    return fail(result.reason === "invalid" ? t.invalid : t.failed);
  }
  redirect(result.signedIn ? ROUTES.client.home : ROUTES.login);
}
