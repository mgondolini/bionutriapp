import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import {
  STUDIO_ASSETS_BUCKET,
  type LogoMimeType,
} from "@/lib/constants/domain";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

/** Tag di cache del branding di uno studio, invalidato al salvataggio delle impostazioni. */
export function studioBrandingTag(slug: string) {
  return `studio-branding:${slug}`;
}

export type StudioBrandingRow = {
  id: string;
  slug: string;
  name: string;
  logo_path: string | null;
  primary_color: string;
};

/**
 * Branding pubblico dello studio (nome, logo, colore) tramite la RPC
 * get_studio_branding, senza sessione: si può mettere in cache.
 */
export async function getStudioBrandingBySlug(
  slug: string,
): Promise<StudioBrandingRow | null> {
  "use cache";
  cacheTag(studioBrandingTag(slug));
  cacheLife("hours");

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_studio_branding", {
    p_slug: slug,
  });
  if (error) throw error;
  return data?.[0] ?? null;
}

/** Aggiorna il branding: la RLS consente l'update solo al titolare dello studio. */
export async function updateStudio(
  studioId: string,
  values: { name: string; primary_color: string; logo_path?: string },
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("studios")
    .update(values)
    .eq("id", studioId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

/** Carica il logo nel percorso {studio_id}/logo-<uuid>.<ext> (policy: solo il titolare). */
export async function uploadLogo(
  studioId: string,
  file: File,
  mimeType: LogoMimeType,
) {
  const extension = mimeType === "image/png" ? "png" : "jpg";
  const path = `${studioId}/logo-${crypto.randomUUID()}.${extension}`;
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(STUDIO_ASSETS_BUCKET)
    .upload(path, file, { contentType: mimeType, upsert: false });
  if (error) throw error;
  return path;
}

export async function removeLogo(path: string) {
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(STUDIO_ASSETS_BUCKET)
    .remove([path]);
  if (error) throw error;
}

/** Contenuto del logo (bucket pubblico), per disegnare le icone della PWA. */
export async function downloadLogo(path: string): Promise<Blob | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.storage
    .from(STUDIO_ASSETS_BUCKET)
    .download(path);
  if (error) return null;
  return data;
}
