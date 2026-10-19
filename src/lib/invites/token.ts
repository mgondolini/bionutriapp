/**
 * Token degli inviti (N-02): 32 byte casuali in base64url. Nel database va
 * SOLO l'hash SHA-256 esadecimale; il token in chiaro esiste solo nel link.
 * Solo lato server (node:crypto), funzioni pure tranne la generazione.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import {
  INVITE_TOKEN_BYTES,
  INVITE_TOKEN_LENGTH,
} from "@/lib/constants/domain";

const TOKEN_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${INVITE_TOKEN_LENGTH}}$`);

export function generateInviteToken(): string {
  return randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
}

/** Hash SHA-256 esadecimale (64 caratteri), lo stesso formato del check in client_invites. */
export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Forma del token: evita di interrogare il database per valori palesemente non validi. */
export function isWellFormedToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

/** Confronto a tempo costante tra un token e un hash salvato. */
export function verifyInviteToken(token: string, storedHash: string): boolean {
  if (!isWellFormedToken(token) || !/^[0-9a-f]{64}$/.test(storedHash)) {
    return false;
  }
  return timingSafeEqual(
    Buffer.from(hashInviteToken(token), "hex"),
    Buffer.from(storedHash, "hex"),
  );
}
