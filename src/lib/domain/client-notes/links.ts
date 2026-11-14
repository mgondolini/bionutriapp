/**
 * Indirizzi dei link nelle note formattate (nota dei video): solo
 * https://, http:// e mailto:. Senza protocollo si aggiunge https:// (o
 * mailto: per un indirizzo email); qualsiasi altro schema (javascript:,
 * data:, file:…) è rifiutato. Funzione pura: la usano l'editor (anteprima
 * "Verrà salvato come…") e il server (pulizia del documento).
 */

const MAX_LENGTH = 2000;
const EMAIL = /^[^\s@/:]+@[^\s@/]+\.[^\s@/]+$/;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;

function webUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname || url.username || url.password) return null;
    // un nome di dominio ha almeno un punto (o è localhost, escluso)
    if (!url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Indirizzo pulito e completo, oppure null se non è ammesso. */
export function normalizeLinkHref(raw: string): string | null {
  const value = raw.trim();
  if (!value || value.length > MAX_LENGTH || /\s/.test(value)) return null;
  if (/^mailto:/i.test(value)) {
    const address = value.slice("mailto:".length);
    return EMAIL.test(address) ? `mailto:${address}` : null;
  }
  if (/^https?:\/\//i.test(value)) return webUrl(value);
  if (EMAIL.test(value)) return `mailto:${value}`;
  // "javascript:", "data:", "ftp:"…: mai. "www.sito.it:8080" non ha schema.
  if (SCHEME.test(value) && !/^[^:/]+\.[^:/]+:\d+/.test(value)) return null;
  if (value.startsWith("//")) return null;
  return webUrl(`https://${value}`);
}
