import { ImageResponse } from "next/og";
import { connection } from "next/server";

import { StudioAppIcon } from "@/components/shared/studio-app-icon";
import {
  getPublicStudio,
  getStudioLogoDataUrl,
} from "@/server/services/studio.service";

/** Icone della PWA (A-14): 192 e 512 px, più una "maskable" con margine di sicurezza. */
const ICONS = [
  { id: "192", size: 192, padding: 0.1 },
  { id: "512", size: 512, padding: 0.1 },
  { id: "maskable", size: 512, padding: 0.2 },
] as const;

export function generateImageMetadata() {
  return ICONS.map(({ id, size }) => ({
    id,
    size: { width: size, height: size },
    contentType: "image/png",
  }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  // Il branding si legge a ogni richiesta: cambia dalle impostazioni dello studio.
  await connection();
  const iconId = String(await id);
  const icon = ICONS.find((item) => item.id === iconId) ?? ICONS[0];
  const studio = await getPublicStudio();
  const logoDataUrl = await getStudioLogoDataUrl(studio);

  return new ImageResponse(
    <StudioAppIcon
      name={studio.name}
      primaryColor={studio.primaryColor}
      logoDataUrl={logoDataUrl}
      size={icon.size}
      padding={icon.padding}
    />,
    { width: icon.size, height: icon.size },
  );
}
