/**
 * Link click-to-chat di WhatsApp (N-01): nessuna API, nessun costo.
 * Il testo contiene solo nome dello studio e link (N-05).
 */
import { activationPath } from "@/lib/constants/domain";

/** https://wa.me/<numero senza "+">?text=<testo codificato> */
export function buildWhatsAppUrl(phoneE164: string, text: string): string {
  const digits = phoneE164.replace(/\D/g, "");
  if (!/^[1-9]\d{6,14}$/.test(digits)) {
    throw new Error("Numero non in formato E.164");
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Link assoluto di attivazione, a partire dall'URL pubblico dell'app. */
export function activationUrl(appUrl: string, token: string): string {
  return new URL(activationPath(token), appUrl).toString();
}
