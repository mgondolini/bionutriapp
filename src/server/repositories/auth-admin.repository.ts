import "server-only";

import { DISABLED_BAN_DURATION } from "@/lib/constants/domain";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Operazioni di Supabase Auth che richiedono la secret key (NF-03): creazione
 * dell'utente all'attivazione, aggiornamento di cellulare ed email, blocco
 * degli account disattivati. Mai raggiungibili dal browser.
 */

export type CreateUserResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "phone_exists" | "email_exists" | "error" };

/** Utente con il cellulare come identificativo (già verificato dall'invito) ed email facoltativa. */
export async function createUser(input: {
  phone: string;
  email: string | null;
  password: string;
}): Promise<CreateUserResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.createUser({
    phone: input.phone,
    phone_confirm: true,
    ...(input.email ? { email: input.email, email_confirm: true } : {}),
    password: input.password,
  });
  if (error || !data.user) {
    if (error?.code === "phone_exists")
      return { ok: false, reason: "phone_exists" };
    if (error?.code === "email_exists")
      return { ok: false, reason: "email_exists" };
    return { ok: false, reason: "error" };
  }
  return { ok: true, userId: data.user.id };
}

/** Compensazione: elimina l'utente appena creato se l'attivazione non va a buon fine. */
export async function deleteUser(userId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(userId);
  return !error;
}

export async function updatePassword(
  userId: string,
  password: string,
): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    password,
  });
  return !error;
}

export type UpdateContactsResult =
  | { ok: true }
  | { ok: false; reason: "phone_exists" | "email_exists" | "error" };

/** Allinea cellulare ed email dell'account a quelli del cliente (A-06). */
export async function updateContacts(
  userId: string,
  contacts: { phone: string; email: string | null },
): Promise<UpdateContactsResult> {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    phone: contacts.phone,
    phone_confirm: true,
    ...(contacts.email ? { email: contacts.email, email_confirm: true } : {}),
  });
  if (!error) return { ok: true };
  if (error.code === "phone_exists")
    return { ok: false, reason: "phone_exists" };
  if (error.code === "email_exists")
    return { ok: false, reason: "email_exists" };
  return { ok: false, reason: "error" };
}

/**
 * Blocca o sblocca l'utente. Bloccato, non può più accedere né rinnovare la
 * sessione; le richieste con una sessione ancora aperta vengono già respinte
 * perché il ruolo (my_context) risulta "client_disabled".
 */
export async function setBanned(
  userId: string,
  banned: boolean,
): Promise<boolean> {
  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.updateUserById(userId, {
    ban_duration: banned ? DISABLED_BAN_DURATION : "none",
  });
  return !error;
}
