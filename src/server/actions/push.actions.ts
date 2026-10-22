"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { authFailure } from "@/server/actions/session-guard";
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
