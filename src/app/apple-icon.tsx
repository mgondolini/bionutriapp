import { ImageResponse } from "next/og";
import { connection } from "next/server";

import { StudioAppIcon } from "@/components/shared/studio-app-icon";
import {
  getPublicStudio,
  getStudioLogoDataUrl,
} from "@/server/services/studio.service";

const SIZE = 180;

export const size = { width: SIZE, height: SIZE };
export const contentType = "image/png";

/** Icona per la schermata Home di iPhone (necessaria per le push su iOS). */
export default async function AppleIcon() {
  await connection();
  const studio = await getPublicStudio();
  const logoDataUrl = await getStudioLogoDataUrl(studio);

  return new ImageResponse(
    <StudioAppIcon
      name={studio.name}
      primaryColor={studio.primaryColor}
      logoDataUrl={logoDataUrl}
      size={SIZE}
      padding={0.1}
    />,
    size,
  );
}
