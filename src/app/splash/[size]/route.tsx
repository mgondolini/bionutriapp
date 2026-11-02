import { ImageResponse } from "next/og";
import { connection } from "next/server";

import { StudioSplash } from "@/components/shared/studio-splash";
import { findSplashSize } from "@/lib/pwa/splash";
import {
  getPublicStudio,
  getStudioLogoDataUrl,
} from "@/server/services/studio.service";

/**
 * Schermata di avvio dell'app installata su iOS (C-06): logo e nome dello
 * studio del dominio, come manifest e icone (il browser la scarica senza
 * cookie). Route Handler solo in lettura e solo per le dimensioni note di
 * `SPLASH_SCREENS`: le altre rispondono 404.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/splash/[size]">,
) {
  await connection();
  const size = findSplashSize((await params).size);
  if (!size) return new Response(null, { status: 404 });

  const studio = await getPublicStudio();
  const logoDataUrl = await getStudioLogoDataUrl(studio);
  return new ImageResponse(
    <StudioSplash
      name={studio.name}
      primaryColor={studio.primaryColor}
      logoDataUrl={logoDataUrl}
      width={size.width}
      height={size.height}
    />,
    {
      ...size,
      // iOS la copia all'installazione; un'ora basta a seguire i cambi di logo
      headers: { "Cache-Control": "public, max-age=3600" },
    },
  );
}
