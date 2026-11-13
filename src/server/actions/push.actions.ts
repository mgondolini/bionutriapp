"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { authFailure } from "@/server/actions/session-guard";
import { introduceOwnPrep } from "@/server/services/onboarding-prep.service";
import * as pushService from "@/server/services/push.service";
import { getSession } from "@/server/services/session.service";
import {
  pushEndpointInputSchema,
  pushSubscriptionSchema,
  type PushEndpointInput,
  type PushSubscriptionInput,
} from "@/server/validation/push.schema";
import { fail, ok, type ActionResult } from "@/types/action-result";

/*
 * Notifiche push del cliente (C-03, C-07): la sottoscrizione di questo
 * browser si salva o si elimina per l'utente della sessione; nessun id
 * arriva dal browser. push_enabled lo aggiorna il trigger del database.
 */

function revalidateClientPush() {
  revalidatePath(ROUTES.client.home);
  revalidatePath(ROUTES.client.profile);
}

/** Dopo il permesso del browser: salva la sottoscrizione (upsert per endpoint). */
export async function savePushSubscriptionAction(
  input: PushSubscriptionInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (session.kind !== "client") return authFailure();

  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) return fail(copy.push.errors.invalidSubscription);

  if (!(await pushService.subscribe(parsed.data))) return authFailure();
  // In Onboarding: presentazione della preparazione della chiamata (C32),
  // una volta per data; non blocca mai il salvataggio
  if (session.client.journeyStage === "onboarding" && session.studio.id) {
    try {
      await introduceOwnPrep({
        id: session.client.id,
        studioId: session.studio.id,
        userId: session.userId,
      });
    } catch (error) {
      console.error("[preparazione] presentazione non programmata", {
        error: error instanceof Error ? error.name : "unknown",
      });
    }
  }
  revalidateClientPush();
  return ok();
}

/** Interruttore del profilo spento: elimina la sottoscrizione di questo browser. */
export async function deletePushSubscriptionAction(
  input: PushEndpointInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (session.kind !== "client") return authFailure();

  const parsed = pushEndpointInputSchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);

  await pushService.unsubscribe(parsed.data.endpoint);
  revalidateClientPush();
  return ok();
}
