import "server-only";

import type { LoginIdentifier } from "@/lib/auth/login-identifier";
import { createPublicClient } from "@/lib/supabase/public";
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

/**
 * `local`: chiude la sessione di questo dispositivo; `global`: tutte le
 * sessioni dell'utente. I cookie vengono cancellati in entrambi i casi.
 */
export async function signOut(scope: "local" | "global" = "local") {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope });
  return { ok: !error, error };
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

/** Utente di Auth della sessione (verificato dal server di Auth), oppure null. */
export async function getAuthUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const { id, email, phone, new_email } = data.user;
  return {
    id,
    email: email || null,
    // Auth salva il cellulare senza "+"
    phone: phone ? `+${phone.replace(/^\+/, "")}` : null,
    newEmail: new_email || null,
  };
}

/**
 * Verifica una password con un login separato, senza cookie: la sessione
 * della richiesta non cambia. La sessione temporanea viene chiusa subito.
 */
export async function verifyPassword(
  identifier: LoginIdentifier,
  password: string,
): Promise<boolean> {
  const supabase = createPublicClient();
  const { error } = await supabase.auth.signInWithPassword({
    ...identifier,
    password,
  });
  if (error) return false;
  await supabase.auth.signOut({ scope: "local" });
  return true;
}

/** Chiude le altre sessioni dell'utente, mantiene quella corrente. */
export async function signOutOthers() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "others" });
  return { ok: !error, error };
}

/**
 * Cambio email sicuro: Supabase invia il link di conferma (al nuovo
 * indirizzo e, con double_confirm_changes, anche a quello attuale).
 * L'email dell'account cambia solo dopo la conferma.
 */
export async function requestEmailChange(email: string, redirectTo: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: redirectTo },
  );
  return { ok: !error, error };
}

/**
 * Conferma del cambio email. `completed` è falso quando manca ancora la
 * conferma dell'altro indirizzo (double_confirm_changes).
 */
export async function verifyEmailChange(tokenHash: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    type: "email_change",
    token_hash: tokenHash,
  });
  if (error) return { ok: false as const };
  return { ok: true as const, completed: data.session !== null };
}
