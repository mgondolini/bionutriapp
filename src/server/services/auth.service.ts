import "server-only";

import { parseLoginIdentifier } from "@/lib/auth/login-identifier";
import { ROUTES } from "@/lib/constants/domain";
import * as authRepository from "@/server/repositories/auth.repository";
import * as pushRepository from "@/server/repositories/push.repository";
import { loadSession, type Session } from "@/server/services/session.service";

/**
 * Login con email o cellulare e password (N-02). Un account senza ruolo (né
 * staff né cliente) viene disconnesso subito, con lo stesso esito di
 * credenziali errate.
 */
export async function signIn(
  identifierInput: string,
  password: string,
): Promise<Session | null> {
  const identifier = parseLoginIdentifier(identifierInput);
  if (!identifier) return null;

  const { ok } = await authRepository.signInWithPassword(identifier, password);
  if (!ok) return null;

  const session = await loadSession();
  if (session.kind === "anonymous") {
    await authRepository.signOut("local");
    return null;
  }
  return session;
}

export type SignOutScope = "local" | "global";

/**
 * Uscita (fase 7). Prima si eliminano le sottoscrizioni push (serve ancora
 * la sessione per la RLS): con `local` solo quella di questo dispositivo,
 * cercata per endpoint; con `global` tutte quelle dell'utente. Poi si chiude
 * la sessione. Un errore sulle sottoscrizioni non impedisce l'uscita.
 */
export async function signOut(
  scope: SignOutScope,
  endpoint: string | null,
  userId: string | null,
): Promise<void> {
  try {
    if (scope === "global" && userId) {
      await pushRepository.deleteAllOwnSubscriptions(userId);
    } else if (endpoint) {
      await pushRepository.deleteOwnSubscription(endpoint);
    }
  } catch (error) {
    // nessun endpoint nei log: solo il codice
    console.error(
      "Eliminazione delle sottoscrizioni push non riuscita",
      (error as { code?: string }).code,
    );
  }
  const { ok, error } = await authRepository.signOut(scope);
  if (!ok) console.error("Uscita non riuscita", error?.code);
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
