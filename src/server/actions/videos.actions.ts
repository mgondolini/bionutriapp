"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { authFailure } from "@/server/actions/session-guard";
import * as videosService from "@/server/services/videos.service";
import { getSession, getStaffSession } from "@/server/services/session.service";
import {
  addVideoSchema,
  createFolderSchema,
  folderIdSchema,
  reorderFoldersSchema,
  reorderVideosSchema,
  updateFolderSchema,
  updateVideoSchema,
  videoIdSchema,
  videoLinkSchema,
  type AddVideoInput,
  type CreateFolderInput,
  type FolderIdInput,
  type ReorderFoldersInput,
  type ReorderVideosInput,
  type UpdateFolderInput,
  type UpdateVideoInput,
  type VideoIdInput,
  type VideoLinkInput,
} from "@/server/validation/videos.schema";
import { fail, ok, type ActionResult } from "@/types/action-result";

const t = copy.admin.videos;

/**
 * Libreria dello staff e tutta l'area cliente: i video compaiono nella
 * sezione Video, nella home e nel contatore del menu (layout di /app).
 */
function revalidateVideos() {
  revalidatePath(ROUTES.admin.videos);
  revalidatePath(ROUTES.client.home, "layout");
}

function invalid(error: z.ZodError) {
  return fail(copy.common.invalidInput, z.flattenError(error).fieldErrors);
}

// --- Cartelle ---------------------------------------------------------

export async function createFolderAction(
  input: CreateFolderInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await getStaffSession();
  if (!session) return authFailure();
  const parsed = createFolderSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await videosService.createFolder(
    session.studio.id,
    parsed.data,
  );
  if (!result.ok) return fail(t.folderForm.failed);
  revalidateVideos();
  return ok({ id: result.id });
}

export async function updateFolderAction(
  input: UpdateFolderInput,
): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return authFailure();
  const parsed = updateFolderSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  if (!(await videosService.updateFolder(parsed.data))) return authFailure();
  revalidateVideos();
  return ok();
}

export async function deleteFolderAction(
  input: FolderIdInput,
): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return authFailure();
  const parsed = folderIdSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await videosService.deleteFolder(parsed.data.folderId);
  if (result === "not_empty") return fail(t.deleteFolderDialog.notEmpty);
  if (result === "not_found") return authFailure();
  revalidateVideos();
  return ok();
}

export async function reorderFoldersAction(
  input: ReorderFoldersInput,
): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return authFailure();
  const parsed = reorderFoldersSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await videosService.reorderFolders(
    parsed.data.parentId,
    parsed.data.ids,
  );
  if (result === "stale") return fail(t.reorder.stale);
  revalidateVideos();
  return ok();
}

// --- Video ------------------------------------------------------------

export type VideoLinkPreview = {
  youtubeId: string;
  title: string | null;
  authorName: string | null;
};

/**
 * Verifica del link nel form (A14, A15): l'errore è il codice del motivo
 * (`copy.admin.videos.videoForm.errors`), così il form mostra il riquadro giusto.
 */
export async function checkVideoLinkAction(
  input: VideoLinkInput,
): Promise<ActionResult<VideoLinkPreview>> {
  const session = await getStaffSession();
  if (!session) return authFailure();
  const parsed = videoLinkSchema.safeParse(input);
  if (!parsed.success) return fail("invalid_link");

  const check = await videosService.checkVideoLink(parsed.data.url);
  if (!check.ok) return fail(check.reason);
  return ok({
    youtubeId: check.youtubeId,
    title: check.title,
    authorName: check.authorName,
  });
}

export async function addVideoAction(
  input: AddVideoInput,
): Promise<ActionResult<{ id: string }>> {
  const session = await getStaffSession();
  if (!session) return authFailure();
  const parsed = addVideoSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await videosService.addVideo(session.studio.id, parsed.data);
  if (!result.ok) {
    switch (result.reason) {
      case "folder_not_found":
        return fail(t.videoForm.failed, {
          folderId: [t.validation.folderRequired],
        });
      case "duplicate":
        return fail(t.videoForm.duplicate, { url: [t.videoForm.duplicate] });
      default:
        // codice del motivo: il form mostra il riquadro dell'errore
        return fail(result.reason);
    }
  }
  revalidateVideos();
  return ok({ id: result.id });
}

export async function updateVideoAction(
  input: UpdateVideoInput,
): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return authFailure();
  const parsed = updateVideoSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await videosService.updateVideo(parsed.data);
  if (result === "folder_not_found") {
    return fail(t.videoForm.failed, {
      folderId: [t.validation.folderRequired],
    });
  }
  if (result === "duplicate") {
    return fail(t.videoForm.duplicate, { folderId: [t.videoForm.duplicate] });
  }
  if (result === "not_found") return authFailure();
  revalidateVideos();
  return ok();
}

export async function deleteVideoAction(
  input: VideoIdInput,
): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return authFailure();
  const parsed = videoIdSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  if (!(await videosService.deleteVideo(parsed.data.videoId))) {
    return authFailure();
  }
  revalidateVideos();
  return ok();
}

export async function reorderVideosAction(
  input: ReorderVideosInput,
): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return authFailure();
  const parsed = reorderVideosSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  const result = await videosService.reorderVideos(
    parsed.data.folderId,
    parsed.data.ids,
  );
  if (result === "stale") return fail(t.reorder.stale);
  revalidateVideos();
  return ok();
}

// --- Cliente ----------------------------------------------------------

/**
 * Prima riproduzione di un video (C16): alimenta "Aperto da" dello staff e
 * toglie "Nuovo". Solo il cliente della sessione, solo i video che vede.
 */
export async function recordVideoViewAction(
  input: VideoIdInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (session.kind !== "client") return authFailure();
  const parsed = videoIdSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);

  if (!(await videosService.recordView(parsed.data.videoId))) {
    return authFailure();
  }
  revalidatePath(ROUTES.client.home, "layout");
  return ok();
}
