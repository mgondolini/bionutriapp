import "server-only";

import { ROUTES } from "@/lib/constants/domain";
import * as authRepository from "@/server/repositories/auth.repository";
import { loadSession, type Session } from "@/server/services/session.service";

/**
 * Converte l'identificativo del login nell'email di Supabase Auth.
 * Oggi accetta solo l'email; nella fase 4 riconoscerà anche il cellulare
 * (ricerca del cliente per telefono) senza cambiare il resto del flusso.
 */
export async function resolveLoginEmail(
  identifier: string,
): Promise<string | null> {
  return identifier.trim().toLowerCase() || null;
}

/**
 * Login con identificativo e password. Un account senza ruolo (né staff né
 * cliente) viene disconnesso subito, con lo stesso esito di credenziali errate.
 */
export async function signIn(
  identifier: string,
  password: string,
): Promise<Session | null> {
  const email = await resolveLoginEmail(identifier);
  if (!email) return null;

  const { ok } = await authRepository.signInWithPassword(email, password);
  if (!ok) return null;

  const session = await loadSession();
  if (session.kind === "anonymous") {
    await authRepository.signOut();
    return null;
  }
  return session;
}

export async function signOut() {
  await authRepository.signOut();
}

/**
 * Invia l'email di recupero. Non rivela mai se l'indirizzo esiste: gli errori
 * vengono solo registrati nel log del server.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}${ROUTES.newPassword}`;
  const { ok, error } = await authRepository.sendPasswordResetEmail(
    email,
    redirectTo,
  );
  if (!ok)
    console.error("Invio email di recupero non riuscito", error?.message);
}

/**
 * Imposta la nuova password. Con il token del link email apre prima la
 * sessione di recupero; senza token vale per l'utente già autenticato.
 */
export async function setNewPassword(
  password: string,
  tokenHash: string | null,
): Promise<Session | null> {
  if (tokenHash) {
    const { ok } = await authRepository.verifyRecoveryToken(tokenHash);
    if (!ok) return null;
  }
  const { ok } = await authRepository.updatePassword(password);
  if (!ok) return null;
  return loadSession();
}
