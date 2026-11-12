"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  JOURNEY_CLIENT_PATH,
  ROUTES,
  clientDetailPath,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { authFailure } from "@/server/actions/session-guard";
import * as journeysService from "@/server/services/journeys.service";
import type { JourneyFailure } from "@/server/services/journeys.service";
import { getStaffSession } from "@/server/services/session.service";
import {
  createJourneySchema,
  sessionIdSchema,
  updateJourneySchema,
  updateSessionSchema,
  type CreateJourneyInput,
  type SessionIdInput,
  type UpdateJourneyInput,
  type UpdateSessionInput,
} from "@/server/validation/journeys.schema";
import { fail, ok, type ActionResult } from "@/types/action-result";

const e = copy.journeys.admin.errors;

const FAILURES: Record<JourneyFailure, string> = {
  not_found: e.notFound,
  already_active: e.alreadyActive,
  concluded: e.concluded,
  previous_not_concluded: e.previousNotConcluded,
  shorten_blocked: copy.journeys.admin.recalcBlocked,
};

/**
 * Scheda Percorso dello staff, pagine del cliente (home e Percorso) e, se la
 * fase cambia, il profilo e l'elenco clienti.
 */
function revalidateJourney(clientId: string) {
  revalidatePath(clientDetailPath(clientId, "percorso"), "layout");
  revalidatePath(ROUTES.client.home);
  revalidatePath(JOURNEY_CLIENT_PATH);
}

function invalid(error: z.ZodError): ActionResult<never> {
  const fieldErrors = z.flattenError(error).fieldErrors as Record<
    string,
    string[] | undefined
  >;
  const first = Object.values(fieldErrors).find((messages) => messages?.length);
  return fail(
    first?.[0] ?? copy.common.invalidInput,
    Object.fromEntries(
      Object.entries(fieldErrors).filter(([, messages]) => messages?.length),
    ) as Record<string, string[]>,
  );
}

/** Nuovo percorso: primo, estensione o ripresa (A18). */
export async function createJourneyAction(
  input: CreateJourneyInput,
): Promise<ActionResult<{ stageChanged: boolean }>> {
  const session = await getStaffSession();
  if (!session) return authFailure();
  const parsed = createJourneySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await journeysService.createJourney(
    session.studio.id,
    parsed.data,
  );
  if (!result.ok) return fail(FAILURES[result.reason]);
  revalidateJourney(parsed.data.clientId);
  if (result.data.stageChanged) {
    revalidatePath(clientDetailPath(parsed.data.clientId), "layout");
    revalidatePath(ROUTES.admin.clients);
  }
  return ok({ stageChanged: result.data.stageChanged });
}

/** Durata o data di inizio (A17): ricalcolo delle sessioni non toccate. */
export async function updateJourneyAction(
  input: UpdateJourneyInput,
): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return authFailure();
  const parsed = updateJourneySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await journeysService.updateJourney(
    session.studio.id,
    parsed.data,
  );
  if (!result.ok) return fail(FAILURES[result.reason]);
  revalidateJourney(result.data.clientId);
  return ok();
}

/** Data, ora, stato e nota di una sessione (A17). */
export async function updateSessionAction(
  input: UpdateSessionInput,
): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return authFailure();
  const parsed = updateSessionSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await journeysService.updateSession(
    session.studio.id,
    parsed.data,
  );
  if (!result.ok) return fail(FAILURES[result.reason]);
  revalidateJourney(result.data.clientId);
  return ok();
}

/** "Ripristina la data calcolata". */
export async function restoreSessionDateAction(
  input: SessionIdInput,
): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return authFailure();
  const parsed = sessionIdSchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);

  const result = await journeysService.restoreSessionDate(
    session.studio.id,
    parsed.data.sessionId,
  );
  if (!result.ok) return fail(FAILURES[result.reason]);
  revalidateJourney(result.data.clientId);
  return ok();
}
