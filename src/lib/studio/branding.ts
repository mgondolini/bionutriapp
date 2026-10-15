/**
 * Branding dello studio (A-14): tipo condiviso e conversioni pure.
 * Nome, logo e colore arrivano sempre dal database; qui c'è solo il fallback.
 */
import { normalizeHexColor } from "@/lib/color";
import { STUDIO_ASSETS_BUCKET } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

export type StudioBranding = {
  /** null solo per il fallback, quando lo studio non è stato trovato. */
  id: string | null;
  slug: string | null;
  name: string;
  logoPath: string | null;
  logoUrl: string | null;
  primaryColor: string;
};

export const FALLBACK_STUDIO: StudioBranding = {
  id: null,
  slug: null,
  name: copy.app.fallbackName,
  logoPath: null,
  logoUrl: null,
  primaryColor: normalizeHexColor(null),
};

type BrandingRow = {
  id: string;
  slug: string;
  name: string;
  logo_path: string | null;
  primary_color: string;
};

/** URL pubblico di un file del bucket studio-assets (nessuna chiamata di rete). */
export function studioAssetUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${STUDIO_ASSETS_BUCKET}/${path}`;
}

export function toStudioBranding(
  row: BrandingRow | null | undefined,
): StudioBranding {
  if (!row) return FALLBACK_STUDIO;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    logoPath: row.logo_path,
    logoUrl: row.logo_path ? studioAssetUrl(row.logo_path) : null,
    primaryColor: normalizeHexColor(row.primary_color),
  };
}

/** Iniziali (massimo due) da un nome: "Studio Verde Nutrizione" → "SV". */
export function initialsOf(...parts: (string | null | undefined)[]): string {
  const words = parts
    .filter((part): part is string => Boolean(part))
    .flatMap((part) => part.trim().split(/\s+/))
    .filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word[0]!.toLocaleUpperCase("it-IT"))
    .join("");
}
