/**
 * Identificativo del login (N-02): email oppure cellulare. Con "@" è
 * un'email, altrimenti un numero da normalizzare in E.164 (paese predefinito IT).
 */
import { z } from "zod";

import { normalizePhone } from "@/lib/phone";

export type LoginIdentifier = { email: string } | { phone: string };

const emailSchema = z.email();

export function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}

export function parseLoginIdentifier(input: string): LoginIdentifier | null {
  const value = input.trim();
  if (!value) return null;
  if (looksLikeEmail(value)) {
    const email = value.toLowerCase();
    return emailSchema.safeParse(email).success ? { email } : null;
  }
  const phone = normalizePhone(value);
  return phone ? { phone } : null;
}
