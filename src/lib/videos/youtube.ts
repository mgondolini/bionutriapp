/**
 * Link e indirizzi di YouTube (mockup v4, A14–A15): funzioni pure.
 * Link accettati: youtube.com/watch?v=…, youtu.be/…, youtube.com/shorts/…
 * (anche m. e www., oppure /embed/…). Si salva solo l'id di 11 caratteri.
 */

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
]);

/** Id del video da un link di YouTube; null se il link non è di YouTube. */
export function parseYouTubeId(input: string): string | null {
  let url: URL;
  try {
    const text = input.trim();
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  let id: string | null = null;
  if (host === "youtu.be" || host === "www.youtu.be") {
    id = url.pathname.split("/")[1] ?? null;
  } else if (YOUTUBE_HOSTS.has(host)) {
    const [, first, second] = url.pathname.split("/");
    if (first === "watch") id = url.searchParams.get("v");
    else if (first === "shorts" || first === "embed" || first === "live") {
      id = second ?? null;
    }
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

export function isYouTubeId(value: string): boolean {
  return YOUTUBE_ID.test(value);
}

/** "https://www.youtube.com/watch?v=…": link canonico, usato anche per oEmbed. */
export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

/** "youtu.be/…": link breve mostrato allo staff. */
export function youtubeShortLabel(id: string): string {
  return `youtu.be/${id}`;
}

/** Origini caricate dal browser: ammesse dalla CSP (src/lib/security/headers.ts). */
export const YOUTUBE_THUMBNAIL_ORIGIN = "https://i.ytimg.com";
export const YOUTUBE_EMBED_ORIGIN = "https://www.youtube-nocookie.com";

/** Anteprima 320×180 servita da YouTube (nessun player caricato). */
export function youtubeThumbnailUrl(id: string): string {
  return `${YOUTUBE_THUMBNAIL_ORIGIN}/vi/${id}/mqdefault.jpg`;
}

/**
 * Player senza cookie di profilazione, caricato solo al tocco (C16):
 * parte subito e resta nella pagina sul telefono.
 */
export function youtubeEmbedUrl(id: string): string {
  return `${YOUTUBE_EMBED_ORIGIN}/embed/${id}?autoplay=1&rel=0&playsinline=1`;
}

export type OembedOutcome =
  "ok" | "not_embeddable" | "unavailable" | "check_failed";

/**
 * Esito della verifica oEmbed dallo stato HTTP: 200 = riproducibile
 * nell'app; 401 = il proprietario non permette l'incorporamento; 400, 403,
 * 404 = video privato, rimosso o inesistente. Limiti di richieste (429) ed
 * errori di YouTube (5xx) non dicono nulla del video: verifica da ripetere.
 */
export function oembedOutcome(status: number): OembedOutcome {
  if (status === 200) return "ok";
  if (status === 401) return "not_embeddable";
  if (status === 429 || status >= 500) return "check_failed";
  return "unavailable";
}
