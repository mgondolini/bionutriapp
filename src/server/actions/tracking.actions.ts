"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  CHECKIN_PATH,
  ROUTES,
  clientDetailPath,
  trackingMetricPath,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { getSession, getStaffSession } from "@/server/services/session.service";
import * as trackingService from "@/server/services/tracking.service";
import type {
  TrackingActor,
  WriteFailure,
} from "@/server/services/tracking.service";
import {
  addEntrySchema,
  checkinSchema,
  entryIdSchema,
  resetGoalSchema,
  saveGoalsSchema,
  updateEntrySchema,
  type AddEntryInput,
  type CheckinInput,
  type EntryIdInput,
  type ResetGoalInput,
  type SaveGoalsInput,
  type UpdateEntryInput,
} from "@/server/validation/tracking.schema";
import { fail, ok, type ActionResult } from "@/types/action-result";
import { authFailure } from "@/server/actions/session-guard";

const e = copy.tracking.errors;

/** Il cliente della sessione, con il tracking sbloccato (non in Onboarding). */
async function clientActor(): Promise<TrackingActor | null> {
  const session = await getSession();
  if (session.kind !== "client") return null;
  return trackingService.clientTrackingActor(session);
}

function failureResult(failure: WriteFailure): ActionResult<never> {
  switch (failure.reason) {
    case "invalid":
      return fail(copy.common.invalidInput, failure.fieldErrors);
    case "read_only":
      return fail(e.readOnly);
    case "not_found":
      return fail(e.metricNotFound);
    case "out_of_range":
      return fail(e.outOfRange);
    case "duplicate":
      return fail(e.duplicateDay);
  }
}

/** Pagine del cliente che mostrano il tracking: home, elenco, check-in e dettaglio. */
function revalidateClientTracking(metricKey?: string) {
  revalidatePath(ROUTES.client.home);
  revalidatePath(ROUTES.client.tracking);
  revalidatePath(CHECKIN_PATH);
  if (metricKey) revalidatePath(trackingMetricPath(metricKey));
}

/** Check-in giornaliero (T-06): i voti scelti di oggi o di ieri, in un'unica operazione. */
export async function saveCheckinAction(
  input: CheckinInput,
): Promise<ActionResult> {
  const actor = await clientActor();
  if (!actor) return authFailure();

  const parsed = checkinSchema.safeParse(input);
  if (!parsed.success) {
    const values = z.flattenError(parsed.error).fieldErrors.values?.[0];
    return fail(values ?? copy.common.invalidInput);
  }

  const result = await trackingService.saveCheckin(actor, parsed.data);
  if (!result.ok) return failureResult(result);
  revalidateClientTracking();
  for (const key of Object.keys(parsed.data.values)) {
    revalidatePath(trackingMetricPath(key));
  }
  return ok();
}

/** Nuova circonferenza (C10) o nuovo allenamento (C11). */
export async function addEntryAction(
  input: AddEntryInput,
): Promise<ActionResult> {
  const actor = await clientActor();
  if (!actor) return authFailure();

  const parsed = addEntrySchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);

  const result = await trackingService.addEntry(
    actor,
    parsed.data.metricId,
    parsed.data.values,
  );
  if (!result.ok) return failureResult(result);
  revalidateClientTracking(result.metricKey);
  return ok();
}

/** Correzione di una registrazione (T-03). */
export async function updateEntryAction(
  input: UpdateEntryInput,
): Promise<ActionResult> {
  const actor = await clientActor();
  if (!actor) return authFailure();

  const parsed = updateEntrySchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);

  const result = await trackingService.updateEntry(
    actor,
    parsed.data.entryId,
    parsed.data.values,
  );
  if (!result.ok) {
    return result.reason === "not_found"
      ? fail(e.entryNotFound)
      : failureResult(result);
  }
  revalidateClientTracking(result.metricKey);
  return ok();
}

/** Eliminazione con conferma (T-03). */
export async function deleteEntryAction(
  input: EntryIdInput,
): Promise<ActionResult> {
  const actor = await clientActor();
  if (!actor) return authFailure();

  const parsed = entryIdSchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);

  const result = await trackingService.deleteEntry(actor, parsed.data.entryId);
  if (!result.ok) {
    return result.reason === "not_found"
      ? fail(e.entryNotFound)
      : failureResult(result);
  }
  revalidateClientTracking(result.metricKey);
  return ok();
}

/**
 * Dopo un cambio di obiettivo: scheda Tracking dello staff e pagine del
 * cliente (descrizioni dei voti nel check-in e nelle abitudini).
 */
function revalidateGoals(clientId: string) {
  revalidatePath(clientDetailPath(clientId, "tracking"), "layout");
  revalidateClientTracking();
  revalidatePath(`${ROUTES.client.tracking}/[metrica]`, "page");
}

/** Obiettivi personali di passi, sonno e acqua (T-07), solo staff dello studio del cliente. */
export async function saveGoalsAction(
  input: SaveGoalsInput,
): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return authFailure();

  const parsed = saveGoalsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path.at(-1) ?? "goals");
      (fieldErrors[field] ??= []).push(issue.message);
    }
    return fail(copy.common.invalidInput, fieldErrors);
  }

  const result = await trackingService.saveGoals(
    session.studio.id,
    parsed.data.clientId,
    parsed.data.goals,
  );
  if (!result.ok) return fail(copy.admin.clients.detail.notFoundDescription);
  revalidateGoals(parsed.data.clientId);
  return ok();
}

/** "Ripristina predefinito" (T-07). */
export async function resetGoalAction(
  input: ResetGoalInput,
): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return authFailure();

  const parsed = resetGoalSchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);

  const result = await trackingService.resetGoal(
    session.studio.id,
    parsed.data.clientId,
    parsed.data.key,
  );
  if (!result.ok) return fail(copy.admin.clients.detail.notFoundDescription);
  revalidateGoals(parsed.data.clientId);
  return ok();
}
