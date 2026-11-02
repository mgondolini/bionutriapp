// Schemi Zod condivisi tra form (client) e Server Actions: niente "server-only".
import { z } from "zod";

import { HEIGHT_LIMITS } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

const h = copy.common.height;
const invalid = h.invalid(HEIGHT_LIMITS.min, HEIGHT_LIMITS.max);

/** "172" (anche "172 cm") → 172; null se non è un intero nei limiti. */
export function parseHeight(value: string): number | null {
  const match = /^(\d{2,3})(?:\s*cm)?$/i.exec(value.trim());
  if (!match) return null;
  const cm = Number(match[1]);
  return cm >= HEIGHT_LIMITS.min && cm <= HEIGHT_LIMITS.max ? cm : null;
}

/** Altezza obbligatoria (attivazione, profilo del cliente), in centimetri interi. */
export const requiredHeight = z
  .string()
  .trim()
  .min(1, h.required)
  .refine((value) => parseHeight(value) !== null, invalid)
  .transform((value) => parseHeight(value)!);

/** Altezza facoltativa (scheda dello staff): vuota = null. */
export const optionalHeight = z
  .string()
  .trim()
  .refine((value) => !value || parseHeight(value) !== null, invalid)
  .transform((value) => (value ? parseHeight(value) : null));
