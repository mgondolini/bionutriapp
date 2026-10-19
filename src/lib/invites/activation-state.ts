/**
 * Esito dell'apertura di un link di invito (funzione pura, DEV-10).
 * Ogni caso non utilizzabile (inesistente, scaduto, usato, revocato, cliente
 * disattivato) dà lo stesso esito "invalid": la pagina mostra un unico
 * messaggio generico e non rivela quale controllo è fallito.
 */
import type { ClientOrigin } from "@/lib/constants/domain";

export type InviteRecord = {
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  client: {
    origin: ClientOrigin;
    accountStatus: string;
    userId: string | null;
  };
};

/**
 * - "imported": cliente già nel database → dati precompilati da verificare (C1)
 * - "new": nuovo cliente → modulo da compilare (C2)
 * - "reset": cliente già attivo con un nuovo link (N-02) → solo nuova password
 */
export type InviteState =
  { kind: "invalid" } | { kind: "imported" | "new" | "reset" };

export function evaluateInvite(
  invite: InviteRecord | null,
  now: Date,
): InviteState {
  if (!invite) return { kind: "invalid" };
  if (invite.usedAt || invite.revokedAt) return { kind: "invalid" };
  if (new Date(invite.expiresAt).getTime() <= now.getTime()) {
    return { kind: "invalid" };
  }
  const { client } = invite;
  if (client.accountStatus === "disabled") return { kind: "invalid" };
  if (client.accountStatus === "active") {
    return client.userId ? { kind: "reset" } : { kind: "invalid" };
  }
  return { kind: client.origin === "imported" ? "imported" : "new" };
}
