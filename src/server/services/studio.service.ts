import "server-only";

import { updateTag } from "next/cache";

import type { LogoMimeType } from "@/lib/constants/domain";
import { toStudioBranding, type StudioBranding } from "@/lib/studio/branding";
import * as studioRepository from "@/server/repositories/studio.repository";
import { getSession } from "@/server/services/session.service";

/**
 * Studio da mostrare (white label, A-14): per gli utenti autenticati quello
 * della sessione, per le pagine pubbliche quello della richiesta.
 */
export async function resolveStudio(): Promise<StudioBranding> {
  const session = await getSession();
  if (session.kind !== "anonymous") return session.studio;
  return getPublicStudio();
}

/**
 * Studio delle pagine pubbliche (login, manifest, icone). Oggi è quello di
 * NEXT_PUBLIC_DEFAULT_STUDIO_SLUG; in futuro sarà ricavato dal sottodominio
 * o da un dominio personalizzato della richiesta.
 */
export async function getPublicStudio(): Promise<StudioBranding> {
  const slug = process.env.NEXT_PUBLIC_DEFAULT_STUDIO_SLUG;
  if (!slug) return toStudioBranding(null);
  return toStudioBranding(await studioRepository.getStudioBrandingBySlug(slug));
}

/**
 * Logo dello studio come data URL, per le icone generate con ImageResponse.
 * null se lo studio non ha un logo o se il download non riesce (si useranno le iniziali).
 */
export async function getStudioLogoDataUrl(
  studio: StudioBranding,
): Promise<string | null> {
  if (!studio.logoPath) return null;
  const blob = await studioRepository.downloadLogo(studio.logoPath);
  if (!blob) return null;
  const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
  return `data:${blob.type || "image/png"};base64,${base64}`;
}

export type StudioSettingsInput = {
  name: string;
  primaryColor: string;
  logo?: { file: File; mimeType: LogoMimeType };
};

/**
 * Salva nome, colore ed eventuale nuovo logo. Il nuovo logo ha sempre un nome
 * diverso (cache di browser e PWA aggiornate) e il precedente viene eliminato.
 * Restituisce false se lo studio non è stato aggiornato (RLS).
 */
export async function updateStudioSettings(
  studio: { id: string; slug: string; logoPath: string | null },
  input: StudioSettingsInput,
): Promise<boolean> {
  const newLogoPath = input.logo
    ? await studioRepository.uploadLogo(
        studio.id,
        input.logo.file,
        input.logo.mimeType,
      )
    : undefined;

  const updated = await studioRepository.updateStudio(studio.id, {
    name: input.name,
    primary_color: input.primaryColor.toUpperCase(),
    ...(newLogoPath ? { logo_path: newLogoPath } : {}),
  });

  if (!updated) {
    if (newLogoPath)
      await studioRepository.removeLogo(newLogoPath).catch(() => undefined);
    return false;
  }

  if (newLogoPath && studio.logoPath) {
    // Pulizia del vecchio logo: un errore non deve annullare il salvataggio.
    await studioRepository.removeLogo(studio.logoPath).catch(() => undefined);
  }

  updateTag(studioRepository.studioBrandingTag(studio.slug));
  return true;
}
