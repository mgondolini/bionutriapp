// Schemi Zod condivisi tra form (client) e Server Actions: niente "server-only".
import { z } from "zod";

import { LOGO_MAX_BYTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

const v = copy.admin.settings.validation;

export const studioSettingsSchema = z.object({
  name: z.string().trim().min(1, v.nameRequired).max(120, v.nameTooLong),
  // il PNG quadrato prodotto dal ritaglio nel browser; firma e dimensioni
  // le ricontrolla la Server Action (checkLogoPng)
  logo: z
    .file()
    .max(LOGO_MAX_BYTES, v.logoSize)
    .mime(["image/png"], v.logoType)
    .optional(),
});
export type StudioSettingsFormInput = z.infer<typeof studioSettingsSchema>;
