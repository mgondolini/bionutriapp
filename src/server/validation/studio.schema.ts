// Schemi Zod condivisi tra form (client) e Server Actions: niente "server-only".
import { z } from "zod";

import { isHexColor } from "@/lib/color";
import { LOGO_MAX_BYTES, LOGO_MIME_TYPES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

const v = copy.admin.settings.validation;

export const studioSettingsSchema = z.object({
  name: z.string().trim().min(1, v.nameRequired).max(120, v.nameTooLong),
  primaryColor: z.string().trim().refine(isHexColor, v.colorInvalid),
  logo: z
    .file()
    .max(LOGO_MAX_BYTES, v.logoSize)
    .mime([...LOGO_MIME_TYPES], v.logoType)
    .optional(),
});
export type StudioSettingsFormInput = z.infer<typeof studioSettingsSchema>;
