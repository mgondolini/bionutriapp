// Schemi Zod condivisi tra form (client) e Server Actions: niente "server-only".
import { z } from "zod";

import {
  VIDEO_FOLDER_DESCRIPTION_MAX,
  VIDEO_FOLDER_NAME_MAX,
  VIDEO_NOTE_MAX,
  VIDEO_TITLE_MAX,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { parseYouTubeId } from "@/lib/videos/youtube";

const v = copy.admin.videos.validation;

/** Testo facoltativo: vuoto = null. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((value) => value || null);

export const VIDEO_FOLDER_VISIBILITIES = ["active", "onboarding"] as const;

/** Cartella o sottocartella (A16). La visibilità vale solo per le cartelle. */
export const folderFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, v.nameRequired)
    .max(VIDEO_FOLDER_NAME_MAX, v.nameTooLong),
  description: optionalText(VIDEO_FOLDER_DESCRIPTION_MAX, v.descriptionTooLong),
  visibility: z.enum(VIDEO_FOLDER_VISIBILITIES),
});
export type FolderFormValues = z.input<typeof folderFormSchema>;

export const createFolderSchema = folderFormSchema.extend({
  parentId: z.uuid().nullable(),
});
export type CreateFolderInput = z.input<typeof createFolderSchema>;
export type CreateFolderData = z.output<typeof createFolderSchema>;

export const updateFolderSchema = folderFormSchema.extend({
  folderId: z.uuid(),
});
export type UpdateFolderInput = z.input<typeof updateFolderSchema>;
export type UpdateFolderData = z.output<typeof updateFolderSchema>;

export const folderIdSchema = z.object({ folderId: z.uuid() });
export type FolderIdInput = z.input<typeof folderIdSchema>;

/** Link incollato (A14): solo YouTube; la verifica oEmbed la fa il server. */
export const videoLinkSchema = z.object({
  url: z
    .string()
    .trim()
    .max(500, v.linkInvalid)
    .refine((value) => parseYouTubeId(value) !== null, v.linkInvalid),
});
export type VideoLinkInput = z.input<typeof videoLinkSchema>;

const videoFields = {
  title: z
    .string()
    .trim()
    .min(1, v.titleRequired)
    .max(VIDEO_TITLE_MAX, v.titleTooLong),
  folderId: z.uuid(v.folderRequired),
  note: optionalText(VIDEO_NOTE_MAX, v.noteTooLong),
};

export const addVideoSchema = videoLinkSchema.extend({
  ...videoFields,
  notify: z.boolean(),
});
export type AddVideoInput = z.input<typeof addVideoSchema>;
export type AddVideoData = z.output<typeof addVideoSchema>;

export const updateVideoSchema = z.object({
  videoId: z.uuid(),
  ...videoFields,
});
export type UpdateVideoInput = z.input<typeof updateVideoSchema>;
export type UpdateVideoData = z.output<typeof updateVideoSchema>;

export const videoIdSchema = z.object({ videoId: z.uuid() });
export type VideoIdInput = z.input<typeof videoIdSchema>;

/** Nuovo ordine di un livello: tutti gli id, nell'ordine scelto. */
export const reorderFoldersSchema = z.object({
  parentId: z.uuid().nullable(),
  ids: z.array(z.uuid()).min(1).max(500),
});
export type ReorderFoldersInput = z.input<typeof reorderFoldersSchema>;

export const reorderVideosSchema = z.object({
  folderId: z.uuid(),
  ids: z.array(z.uuid()).min(1).max(1000),
});
export type ReorderVideosInput = z.input<typeof reorderVideosSchema>;
