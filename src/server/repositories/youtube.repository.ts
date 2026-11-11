import "server-only";

import {
  YOUTUBE_OEMBED_TIMEOUT_MS,
  YOUTUBE_OEMBED_URL,
} from "@/lib/constants/domain";
import { youtubeWatchUrl } from "@/lib/videos/youtube";

/*
 * Verifica di un video con l'oEmbed pubblico di YouTube (nessuna chiave):
 * stato HTTP, titolo e canale. È l'unica chiamata verso YouTube dal server;
 * l'indirizzo è fisso (si costruisce dall'id già validato), quindi il browser
 * non sceglie dove il server fa richieste. YOUTUBE_OEMBED_URL nell'ambiente
 * serve solo ai test e2e (servizio locale).
 */

export type OembedResponse =
  | { status: number; title: string | null; authorName: string | null }
  | { status: "network_error" };

export async function fetchOembed(youtubeId: string): Promise<OembedResponse> {
  const endpoint = process.env.YOUTUBE_OEMBED_URL ?? YOUTUBE_OEMBED_URL;
  const url = new URL(endpoint);
  url.searchParams.set("url", youtubeWatchUrl(youtubeId));
  url.searchParams.set("format", "json");
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(YOUTUBE_OEMBED_TIMEOUT_MS),
    });
    if (!response.ok)
      return { status: response.status, title: null, authorName: null };
    const body = (await response.json()) as {
      title?: unknown;
      author_name?: unknown;
    };
    return {
      status: response.status,
      title: typeof body.title === "string" ? body.title : null,
      authorName:
        typeof body.author_name === "string" ? body.author_name : null,
    };
  } catch {
    return { status: "network_error" };
  }
}
