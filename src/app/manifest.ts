import type { MetadataRoute } from "next";
import { connection } from "next/server";

import { APP_BACKGROUND_COLOR, ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { getPublicStudio } from "@/server/services/studio.service";

const SHORT_NAME_MAX = 12;

/**
 * Manifest della PWA con il branding dello studio del dominio (il browser lo
 * scarica senza cookie). start_url "/app": l'app installata apre l'area cliente (DEV-04).
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  await connection();
  const studio = await getPublicStudio();
  const shortName =
    studio.name.length <= SHORT_NAME_MAX
      ? studio.name
      : studio.name.slice(0, SHORT_NAME_MAX).trim();

  return {
    // identità stabile dell'app installata, anche se cambia start_url
    id: ROUTES.client.home,
    name: studio.name,
    short_name: shortName,
    description: copy.manifest.description(studio.name),
    lang: "it",
    start_url: ROUTES.client.home,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: APP_BACKGROUND_COLOR,
    theme_color: studio.primaryColor,
    icons: [
      { src: "/icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon/maskable",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
