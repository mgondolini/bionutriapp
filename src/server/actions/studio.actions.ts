"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { LogoMimeType } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { getSession } from "@/server/services/session.service";
import { updateStudioSettings } from "@/server/services/studio.service";
import { studioSettingsSchema } from "@/server/validation/studio.schema";
import { fail, ok, type ActionResult } from "@/types/action-result";

/**
 * Impostazioni dello studio (A-14), solo per il titolare. Lo studio si ricava
 * dalla sessione, mai dai dati inviati dal form.
 */
export async function updateStudioSettingsAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (session.kind !== "staff" || session.role !== "owner") {
    return fail(copy.common.unauthorized);
  }
  const { id, slug, logoPath } = session.studio;
  if (!id || !slug) return fail(copy.common.genericError);

  const logo = formData.get("logo");
  const parsed = studioSettingsSchema.safeParse({
    name: formData.get("name"),
    primaryColor: formData.get("primaryColor"),
    logo: logo instanceof File && logo.size > 0 ? logo : undefined,
  });
  if (!parsed.success) {
    return fail(
      copy.common.invalidInput,
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  try {
    const updated = await updateStudioSettings(
      { id, slug, logoPath },
      {
        name: parsed.data.name,
        primaryColor: parsed.data.primaryColor,
        logo: parsed.data.logo
          ? {
              file: parsed.data.logo,
              mimeType: parsed.data.logo.type as LogoMimeType,
            }
          : undefined,
      },
    );
    if (!updated) return fail(copy.common.unauthorized);
  } catch (error) {
    console.error(
      "Salvataggio delle impostazioni dello studio non riuscito",
      error,
    );
    return fail(copy.common.genericError);
  }

  // Colore e logo compaiono in entrambe le aree e nel manifest.
  revalidatePath("/", "layout");
  return ok();
}
