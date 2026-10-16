/**
 * Cellulari: normalizzazione in E.164 e ricerca (funzioni pure, DEV-10).
 * Il trigger del database normalizza a sua volta, come seconda barriera.
 */
import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_SEARCH_MIN_DIGITS,
} from "@/lib/constants/domain";

const COUNTRY = DEFAULT_PHONE_COUNTRY as CountryCode;

/** Numero in formato E.164 (es. "+393331234567"), oppure null se non valido. */
export function normalizePhone(
  input: string | null | undefined,
): string | null {
  const value = input?.trim();
  if (!value) return null;
  const parsed = parsePhoneNumberFromString(value, COUNTRY);
  return parsed?.isValid() ? parsed.number : null;
}

export function isValidPhone(input: string | null | undefined): boolean {
  return normalizePhone(input) !== null;
}

/** Numero leggibile (es. "+39 333 123 4567"); se non riconosciuto lo restituisce invariato. */
export function formatPhone(e164: string): string {
  return parsePhoneNumberFromString(e164)?.formatInternational() ?? e164;
}

export function digitsOf(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Varianti di cifre da cercare nel cellulare: la ricerca vale anche se il numero
 * è digitato con spazi, con "+39"/"0039" oppure senza prefisso.
 * Nessuna variante se ci sono troppe poche cifre.
 */
export function phoneSearchDigits(query: string): string[] {
  const digits = digitsOf(query);
  if (digits.length < PHONE_SEARCH_MIN_DIGITS) return [];
  const variants = new Set([digits]);
  for (const prefix of ["0039", "39"]) {
    const rest = digits.startsWith(prefix) ? digits.slice(prefix.length) : "";
    if (rest.length >= PHONE_SEARCH_MIN_DIGITS) variants.add(rest);
  }
  return [...variants];
}

export function phoneMatchesQuery(e164: string, query: string): boolean {
  const phoneDigits = digitsOf(e164);
  return phoneSearchDigits(query).some((variant) =>
    phoneDigits.includes(variant),
  );
}
