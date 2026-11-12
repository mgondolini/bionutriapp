/**
 * Link della videochiamata di una sessione (A17, C19). La sessione può avere
 * un link proprio (impostato dallo staff o, dalla v2.0, creato con l'evento
 * Google); altrimenti vale quello del cliente. È l'unico punto che sceglie il
 * link: interfaccia, eventi del calendario e file .ics passano da qui.
 */
import { MEET_URL_PATTERN } from "@/lib/constants/domain";

export function resolveMeetingUrl(
  session: { meetingUrl: string | null } | null,
  client: { meetingUrl: string | null } | null,
): string | null {
  return session?.meetingUrl || client?.meetingUrl || null;
}

/** Vero per https://meet.google.com/abc-defg-hij e nient'altro. */
export function isMeetUrl(value: string): boolean {
  return MEET_URL_PATTERN.test(value);
}

/** Testo del link senza "https://": meet.google.com/abc-defg-hij. */
export function meetingLinkText(url: string): string {
  return url.replace(/^https:\/\//, "");
}
