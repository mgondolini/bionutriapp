"use server";

import { revalidatePath } from "next/cache";

import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { authFailure } from "@/server/actions/session-guard";
import * as notificationsService from "@/server/services/notifications.service";
import { getSession } from "@/server/services/session.service";
import {
  notificationPreferenceSchema,
  type NotificationPreferenceInput,
} from "@/server/validation/notifications.schema";
import { fail, ok, type ActionResult } from "@/types/action-result";

/**
 * "Nuovi file" e "Promemoria serale" nel profilo del cliente (C-07): valgono
 * per tutti i dispositivi dell'utente della sessione; nessun id dal browser.
 */
export async function setNotificationPreferenceAction(
  input: NotificationPreferenceInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (session.kind !== "client") return authFailure();

  const parsed = notificationPreferenceSchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);

  try {
    await notificationsService.setOwnPreference(
      session.userId,
      parsed.data.key,
      parsed.data.enabled,
    );
  } catch {
    return fail(copy.profile.notifications.preferences.failed);
  }
  revalidatePath(ROUTES.client.profile);
  return ok();
}
