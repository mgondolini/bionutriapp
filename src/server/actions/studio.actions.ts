"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { copy } from "@/lib/copy/it";
import { checkLogoPng, PNG_HEADER_BYTES } from "@/lib/logo/png";
import { getSession } from "@/server/services/session.service";
import { updateStudioSettings } from "@/server/services/studio.service";
import { studioSettingsSchema } from "@/server/validation/studio.schema";
import { fail, ok, type ActionResult } from "@/types/action-result";
import { authFailure } from "@/server/actions/session-guard";

/**
 * Impostazioni dello studio (A-14), solo per il titolare. Lo studio si ricava
 * dalla sessione, mai dai dati inviati dal form.
 */
export async function updateStudioSettingsAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await getSession();
  if (session.kind !== "staff" || session.role !== "owner") {
    return authFailure();
  }
  const { id, slug, logoPath } = session.studio;
  if (!id || !slug) return fail(copy.common.genericError);

  const logo = formData.get("logo");
  const parsed = studioSettingsSchema.safeParse({
    name: formData.get("name"),
    logo: logo instanceof File && logo.size > 0 ? logo : undefined,
  });
  if (!parsed.success) {
    return fail(
      copy.common.invalidInput,
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  if (parsed.data.logo) {
    const header = new Uint8Array(
      await parsed.data.logo.slice(0, PNG_HEADER_BYTES).arrayBuffer(),
    );
    const check = checkLogoPng(header);
    if (check !== "ok") {
      return fail(copy.common.invalidInput, {
        logo: [copy.admin.settings.validation.logoPng[check]],
      });
    }
  }

  try {
    const updated = await updateStudioSettings(
      { id, slug, logoPath },
      {
        name: parsed.data.name,
        logo: parsed.data.logo
          ? {
              file: parsed.data.logo,
              mimeType: "image/png",
            }
          : undefined,
      },
    );
    if (!updated) return authFailure();
  } catch (error) {
    console.error(
      "Salvataggio delle impostazioni dello studio non riuscito",
      error,
    );
    return fail(copy.common.genericError);
  }

  // Nome e logo compaiono in entrambe le aree e nel manifest.
  revalidatePath("/", "layout");
  return ok();
}
