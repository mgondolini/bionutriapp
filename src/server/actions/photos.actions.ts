"use server";

import { revalidatePath } from "next/cache";

import { ROUTES, clientDetailPath } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { authFailure } from "@/server/actions/session-guard";
import * as photosService from "@/server/services/photos.service";
import type {
  PhotoActor,
  PhotoFailure,
} from "@/server/services/photos.service";
import { getSession } from "@/server/services/session.service";
import {
  confirmPhotoSchema,
  photoSessionSchema,
  photoSlotSchema,
  type ConfirmPhotoInput,
  type PhotoSessionInput,
  type PhotoSlotInput,
} from "@/server/validation/photos.schema";
import { fail, ok, type ActionResult } from "@/types/action-result";

/*
 * Foto di avanzamento: le stesse azioni per staff e cliente, con le stesse
 * regole (FOTO-08). Dopo il salvataggio non esiste un'azione di modifica o
 * eliminazione: la cancellazione su richiesta del cliente (GDPR) è una
 * procedura dello studio, fuori dall'app (`pnpm client:delete`).
 */

const e = copy.photos.errors;

const FAILURES: Record<PhotoFailure, string> = {
  not_found: e.notFound,
  not_open: e.notOpen,
  saved: e.saved,
  read_only: e.readOnly,
  incomplete: e.incomplete,
  upload_failed: e.uploadFailed,
  rejected: e.rejected,
};

/** Staff dello studio o cliente sbloccato; il cliente scrive solo In percorso. */
async function photoActor(): Promise<PhotoActor | null> {
  const session = await getSession();
  if (session.kind === "staff" && session.studio.id) {
    return { kind: "staff", studioId: session.studio.id };
  }
  if (session.kind === "client" && session.client.unlocked) {
    return {
      kind: "client",
      clientId: session.client.id,
      canWrite: session.client.journeyStage === "in_progress",
    };
  }
  return null;
}

/** Scheda Foto (con il badge della scheda), percorso, pagine del cliente. */
function revalidatePhotos(clientId: string) {
  revalidatePath(`${ROUTES.admin.clients}/${clientId}`, "layout");
  revalidatePath(clientDetailPath(clientId, "foto"));
  revalidatePath(ROUTES.client.home, "layout");
}

/** Primo passaggio: apre il set se serve e restituisce l'URL di caricamento. */
export async function preparePhotoUploadAction(
  input: PhotoSlotInput,
): Promise<ActionResult<{ objectId: string; uploadUrl: string }>> {
  const actor = await photoActor();
  if (!actor) return authFailure();
  const parsed = photoSlotSchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);
  const result = await photosService.preparePhotoUpload(actor, parsed.data);
  if (!result.ok) return fail(FAILURES[result.reason]);
  return ok({ objectId: result.objectId, uploadUrl: result.uploadUrl });
}

/** Terzo passaggio: il server verifica l'immagine e registra la foto. */
export async function confirmPhotoUploadAction(
  input: ConfirmPhotoInput,
): Promise<ActionResult> {
  const actor = await photoActor();
  if (!actor) return authFailure();
  const parsed = confirmPhotoSchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);
  const result = await photosService.confirmPhotoUpload(actor, parsed.data);
  if (!result.ok) return fail(FAILURES[result.reason]);
  revalidatePhotos(result.clientId);
  return ok();
}

/** Elimina una foto di un set non ancora salvato. */
export async function deletePhotoAction(
  input: PhotoSlotInput,
): Promise<ActionResult> {
  const actor = await photoActor();
  if (!actor) return authFailure();
  const parsed = photoSlotSchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);
  const result = await photosService.deletePhoto(actor, parsed.data);
  if (!result.ok) return fail(FAILURES[result.reason]);
  revalidatePhotos(result.clientId);
  return ok();
}

/** "Salva le foto" → "Foto salvate": definitivo per tutti. */
export async function savePhotoSetAction(
  input: PhotoSessionInput,
): Promise<ActionResult> {
  const actor = await photoActor();
  if (!actor) return authFailure();
  const parsed = photoSessionSchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);
  const result = await photosService.savePhotoSet(actor, parsed.data);
  if (!result.ok) return fail(FAILURES[result.reason]);
  revalidatePhotos(result.clientId);
  return ok();
}
