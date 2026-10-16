import "server-only";

import type { LoginIdentifier } from "@/lib/auth/login-identifier";
import { createClient } from "@/lib/supabase/server";

/**
 * Login con email o cellulare (E.164) e password; i cookie di sessione
 * vengono scritti dal client server.
 */
export async function signInWithPassword(
  identifier: LoginIdentifier,
  password: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    ...identifier,
    password,
  });
  return { ok: !error };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

/** Invia l'email di recupero; il link porta a `redirectTo` con il token_hash. */
export async function sendPasswordResetEmail(
  email: string,
  redirectTo: string,
) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });
  return { ok: !error, error };
}

/** Verifica il token di recupero e apre la sessione dell'utente. */
export async function verifyRecoveryToken(tokenHash: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type: "recovery",
    token_hash: tokenHash,
  });
  return { ok: !error };
}

export async function updatePassword(password: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  return { ok: !error, error };
}
