/**
 * Link della videochiamata di una sessione (A17, C19): uno per ogni check,
 * quello del Meet che Google Calendar crea con l'evento, copiato dallo staff
 * nella sessione (dalla v2.0 lo scriverà l'app creando l'evento). Non c'è più
 * un link del cliente valido per tutti i check (decisione del 13 novembre
 * 2026): la colonna clients.meeting_url resta nel database ma l'app non la usa.
 */
import { MEET_URL_PATTERN } from "@/lib/constants/domain";

/** Vero per https://meet.google.com/abc-defg-hij e nient'altro. */
export function isMeetUrl(value: string): boolean {
  return MEET_URL_PATTERN.test(value);
}

/** Testo del link senza "https://": meet.google.com/abc-defg-hij. */
export function meetingLinkText(url: string): string {
  return url.replace(/^https:\/\//, "");
}
