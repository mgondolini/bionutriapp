"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  CLIENT_FILE_ROUTES,
  ROUTES,
  clientDetailPath,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import * as filesService from "@/server/services/files.service";
import type { FileActor } from "@/server/services/files.service";
import { getSession, getStaffSession } from "@/server/services/session.service";
import {
  confirmUploadSchema,
  fileIdSchema,
  openFileSchema,
  prepareUploadSchema,
  type ConfirmUploadInput,
  type FileIdInput,
  type OpenFileInput,
  type PrepareUploadInput,
} from "@/server/validation/files.schema";
import { fail, ok, type ActionResult } from "@/types/action-result";

const t = copy.files;

/** Scheda File e colonna "Ultimo file" dell'elenco clienti. */
function revalidateStaffFiles(clientId: string) {
  revalidatePath(ROUTES.admin.clients);
  revalidatePath(clientDetailPath(clientId, "file"));
}

/**
 * Caricamento, primo passaggio (A-08): valida metadati e file dichiarati
 * (solo PDF, al massimo 10 MB) e restituisce l'URL firmato per caricare il
 * file direttamente su Storage (il corpo delle richieste di Netlify è
 * limitato a circa 6 MB). Il percorso lo decide il server.
 */
export async function prepareUploadAction(
  input: PrepareUploadInput,
): Promise<ActionResult<{ fileId: string; uploadUrl: string }>> {
  const session = await getStaffSession();
  if (!session) return fail(copy.common.unauthorized);

  const parsed = prepareUploadSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;
    const fileError =
      fieldErrors.fileName?.[0] ??
      fieldErrors.fileType?.[0] ??
      fieldErrors.fileSize?.[0];
    return fail(fileError ?? copy.common.invalidInput, fieldErrors);
  }

  const result = await filesService.prepareUpload(
    session.studio.id,
    parsed.data,
  );
  if (!result.ok) return fail(copy.admin.clients.detail.notFoundDescription);
  return ok({ fileId: result.fileId, uploadUrl: result.uploadUrl });
}

/**
 * Caricamento, terzo passaggio: il server verifica l'oggetto caricato e solo
 * allora crea la riga; "Avvisa il cliente" passa dal servizio notifiche.
 */
export async function confirmUploadAction(
  input: ConfirmUploadInput,
): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return fail(copy.common.unauthorized);

  const parsed = confirmUploadSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      copy.common.invalidInput,
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const result = await filesService.confirmUpload(
    session.studio.id,
    parsed.data,
  );
  if (!result.ok) {
    return fail(
      result.reason === "not_found"
        ? copy.admin.clients.detail.notFoundDescription
        : t.uploadErrors[result.reason],
    );
  }

  revalidateStaffFiles(parsed.data.clientId);
  return ok();
}

/**
 * Apertura o scaricamento (A-11, C-02, C-04, C-05), unico percorso per staff
 * e cliente: URL firmato di 60 secondi. Se apre il cliente, la prima lettura
 * viene registrata e le sue pagine si aggiornano (scompare "Nuovo").
 */
export async function openFileAction(
  input: OpenFileInput,
): Promise<ActionResult<{ url: string }>> {
  const session = await getSession();
  let actor: FileActor;
  if (session.kind === "staff" && session.studio.id) {
    actor = { kind: "staff", studioId: session.studio.id };
  } else if (session.kind === "client") {
    actor = {
      kind: "client",
      clientId: session.client.id,
      unlocked: session.client.unlocked,
    };
  } else {
    return fail(copy.common.unauthorized);
  }

  const parsed = openFileSchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);

  const result = await filesService.openFile(
    actor,
    parsed.data.fileId,
    parsed.data.mode,
  );
  if (!result.ok) {
    return fail(result.reason === "not_found" ? t.notFound : t.notAvailable);
  }

  if (actor.kind === "client") {
    revalidatePath(ROUTES.client.home);
    revalidatePath(CLIENT_FILE_ROUTES[result.category]);
  }
  return ok({ url: result.url });
}

/** Eliminazione con conferma (A-11): riga e oggetto in Storage. */
export async function deleteFileAction(
  input: FileIdInput,
): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return fail(copy.common.unauthorized);

  const parsed = fileIdSchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);

  const result = await filesService.deleteFile(
    session.studio.id,
    parsed.data.fileId,
  );
  if (!result.ok) return fail(t.notFound);

  revalidateStaffFiles(result.clientId);
  return ok();
}
