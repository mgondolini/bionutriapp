/**
 * Foto di avanzamento: input delle Server Actions (DEV-09). Dal browser
 * arrivano solo la sessione, la vista e l'id dell'oggetto caricato: il
 * percorso nello Storage lo costruisce il server.
 */
import { z } from "zod";

import { PHOTO_VIEWS } from "@/lib/constants/domain";

export const photoViewSchema = z.enum(PHOTO_VIEWS);

export const photoSessionSchema = z.object({ sessionId: z.uuid() });
export type PhotoSessionInput = z.input<typeof photoSessionSchema>;

export const photoSlotSchema = z.object({
  sessionId: z.uuid(),
  view: photoViewSchema,
});
export type PhotoSlotInput = z.input<typeof photoSlotSchema>;

export const confirmPhotoSchema = photoSlotSchema.extend({
  objectId: z.uuid(),
});
export type ConfirmPhotoInput = z.input<typeof confirmPhotoSchema>;
