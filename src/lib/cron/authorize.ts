import { createHash, timingSafeEqual } from "node:crypto";

/** Lunghezza minima del segreto del cron (generato con `openssl rand -hex 32`). */
export const CRON_SECRET_MIN_LENGTH = 32;

/**
 * Verifica l'header `Authorization: Bearer <segreto>` del cron (DEV-05).
 * Confronto a tempo costante sugli hash (stessa lunghezza qualunque sia
 * l'input). Senza un segreto configurato, o troppo corto, rifiuta sempre.
 */
export function isAuthorizedCronRequest(
  authorization: string | null,
  secret: string | undefined,
): boolean {
  if (!secret || secret.length < CRON_SECRET_MIN_LENGTH) return false;
  if (!authorization?.startsWith("Bearer ")) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(
    digest(authorization.slice("Bearer ".length)),
    digest(secret),
  );
}
