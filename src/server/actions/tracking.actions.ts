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
  setMeasureCheckSchema,
  updateEntrySchema,
  type AddEntryInput,
  type CheckinInput,
  type EntryIdInput,
  type ResetGoalInput,
  type SaveGoalsInput,
  type SetMeasureCheckInput,
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

/**
 * Chi scrive una registrazione (A-15, T-03): il cliente per sé (un `clientId`
 * inviato dal browser viene rifiutato), lo staff per un cliente del proprio
 * studio, sempre preso dalla sessione.
 */
async function entryActor(
  clientId: string | undefined,
): Promise<ActionResult<TrackingActor>> {
  const session = await getSession();
  if (session.kind === "client" && !clientId) {
    const actor = trackingService.clientTrackingActor(session);
    if (actor) return ok(actor);
  }
  if (session.kind === "staff" && clientId && session.studio.id) {
    const actor = await trackingService.staffTrackingActor(
      session.studio.id,
      clientId,
    );
    return actor
      ? ok(actor)
      : fail(copy.admin.clients.detail.notFoundDescription);
  }
  return authFailure();
}

function failureResult(failure: WriteFailure): ActionResult<never> {
  switch (failure.reason) {
    case "invalid":
      return fail(copy.common.invalidInput, failure.fieldErrors);
    case "read_only":
      return fail(e.readOnly);
    case "not_editable":
      return fail(e.notEditable);
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

/**
 * Dopo una registrazione, di chiunque sia: le pagine del cliente, la scheda
 * Tracking dello staff (card, medie, "In ritardo", dettaglio) e l'elenco
 * clienti ("ultima misura").
 */
function revalidateEntry(actor: TrackingActor, metricKey: string) {
  revalidateClientTracking(metricKey);
  revalidatePath(clientDetailPath(actor.clientId, "tracking"), "layout");
  revalidatePath(ROUTES.admin.clients);
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

/**
 * Nuova circonferenza (C10) o nuovo allenamento (C11) del cliente; per lo
 * staff anche il voto di un'abitudine (A-15).
 */
export async function addEntryAction(
  input: AddEntryInput,
): Promise<ActionResult> {
  const parsed = addEntrySchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);
  const resolved = await entryActor(parsed.data.clientId);
  if (!resolved.ok) return resolved;
  const actor = resolved.data;

  const result = await trackingService.addEntry(
    actor,
    parsed.data.metricId,
    parsed.data.values,
  );
  if (!result.ok) return failureResult(result);
  revalidateEntry(actor, result.metricKey);
  return ok();
}

/** Correzione di una registrazione (T-03, A-15). */
export async function updateEntryAction(
  input: UpdateEntryInput,
): Promise<ActionResult> {
  const parsed = updateEntrySchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);
  const resolved = await entryActor(parsed.data.clientId);
  if (!resolved.ok) return resolved;
  const actor = resolved.data;

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
  revalidateEntry(actor, result.metricKey);
  return ok();
}

/** Eliminazione con conferma (T-03, A-15). */
export async function deleteEntryAction(
  input: EntryIdInput,
): Promise<ActionResult> {
  const parsed = entryIdSchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);
  const resolved = await entryActor(parsed.data.clientId);
  if (!resolved.ok) return resolved;
  const actor = resolved.data;

  const result = await trackingService.deleteEntry(actor, parsed.data.entryId);
  if (!result.ok) {
    return result.reason === "not_found"
      ? fail(e.entryNotFound)
      : failureResult(result);
  }
  revalidateEntry(actor, result.metricKey);
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

/**
 * Prossimo check di peso e circonferenze (solo staff): una data da oggi a un
 * anno, oppure `null` per tornare a ultima registrazione + 30 giorni.
 */
export async function setMeasureCheckAction(
  input: SetMeasureCheckInput,
): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return authFailure();

  const parsed = setMeasureCheckSchema.safeParse(input);
  if (!parsed.success) {
    const day = z.flattenError(parsed.error).fieldErrors.day?.[0];
    return fail(
      day ?? copy.common.invalidInput,
      day ? { day: [day] } : undefined,
    );
  }

  const result = await trackingService.setMeasureCheck(
    session.studio.id,
    parsed.data.clientId,
    parsed.data.day,
  );
  if (!result.ok) return fail(copy.admin.clients.detail.notFoundDescription);
  revalidateGoals(parsed.data.clientId);
  revalidatePath(ROUTES.admin.clients);
  return ok();
}
