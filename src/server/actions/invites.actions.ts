"use server";

import { copy } from "@/lib/copy/it";
import { getStaffSession } from "@/server/services/session.service";
import {
  sendInviteSchema,
  type SendInviteInput,
} from "@/server/validation/clients.schema";
import { fail, type ActionResult } from "@/types/action-result";

/**
 * Invito su WhatsApp (N-01). Segnaposto: la generazione del link e l'apertura
 * di WhatsApp arrivano nella fase 4. Controlli di sessione e input già attivi.
 */
export async function sendWhatsAppInviteAction(
  input: SendInviteInput,
): Promise<ActionResult<{ whatsappUrl: string }>> {
  const session = await getStaffSession();
  if (!session) return fail(copy.common.unauthorized);

  const parsed = sendInviteSchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);

  return fail(copy.admin.clients.inviteSoon);
}
