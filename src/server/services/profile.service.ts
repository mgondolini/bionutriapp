import "server-only";

import type { LoginIdentifier } from "@/lib/auth/login-identifier";
import { EMAIL_CHANGE_DOUBLE_CONFIRM, ROUTES } from "@/lib/constants/domain";
import * as authRepository from "@/server/repositories/auth.repository";
import * as profileRepository from "@/server/repositories/profile.repository";
import {
  toClientProfileUpdate,
  type ClientProfileInput,
  type StaffProfileInput,
} from "@/server/validation/profile.schema";

/*
 * Profilo (C-07, A-06): l'utente è sempre quello della sessione, ricavato
 * dalla Server Action; nessun id arriva dal browser.
 */

/** Email dell'account (Auth) e quella in attesa di conferma. */
export type AccountEmail = { current: string | null; pending: string | null };

export type ClientProfilePage = {
  firstName: string;
  lastName: string | null;
  phone: string;
  birthDate: string | null;
  activatedAt: string | null;
  pushEnabled: boolean;
  email: AccountEmail;
};

/** Profilo del cliente (C13), disponibile anche in Onboarding. */
export async function getClientProfile(
  clientId: string,
): Promise<ClientProfilePage | null> {
  const [client, user] = await Promise.all([
    profileRepository.getOwnClient(clientId),
    authRepository.getAuthUser(),
  ]);
  if (!client || !user) return null;
  return {
    firstName: client.first_name,
    lastName: client.last_name,
    phone: client.phone,
    birthDate: client.birth_date,
    activatedAt: client.activated_at,
    pushEnabled: client.push_enabled,
    // l'email dell'account è quella di Auth; clients.email la segue dopo la conferma
    email: { current: user.email ?? client.email, pending: user.newEmail },
  };
}

export type StaffProfilePage = {
  title: string | null;
  firstName: string;
  lastName: string | null;
  displayName: string;
  email: AccountEmail;
};

/** Profilo del professionista (/admin/profilo). */
export async function getStaffProfile(
  studioId: string,
  userId: string,
): Promise<StaffProfilePage | null> {
  const [member, user] = await Promise.all([
    profileRepository.getOwnMember(studioId, userId),
    authRepository.getAuthUser(),
  ]);
  if (!member || !user) return null;
  return {
    title: member.title,
    firstName: member.first_name,
    lastName: member.last_name,
    displayName: member.display_name ?? member.first_name,
    email: { current: user.email, pending: user.newEmail },
  };
}

export function updateClientProfile(input: ClientProfileInput) {
  return profileRepository.updateOwnClient(toClientProfileUpdate(input));
}

export function updateStaffProfile(input: StaffProfileInput) {
  return profileRepository.updateOwnMember(input);
}

export type EmailChangeOutcome =
  | { ok: true; email: string; confirmBoth: boolean }
  | { ok: false; reason: "same" | "unavailable" | "failed" };

/**
 * Cambio o aggiunta dell'email (N-02: con un'email il cliente recupera la
 * password da solo). Per i clienti si controlla prima l'indice unico dello
 * studio, così la conferma non fallisce nel trigger sync_client_email.
 */
export async function requestEmailChange(
  email: string,
  options: { isClient: boolean },
): Promise<EmailChangeOutcome> {
  const user = await authRepository.getAuthUser();
  if (!user) return { ok: false, reason: "failed" };
  if (user.email === email) return { ok: false, reason: "same" };
  if (options.isClient && !(await profileRepository.isEmailAvailable(email))) {
    return { ok: false, reason: "unavailable" };
  }
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL}${ROUTES.confirmEmail}`;
  const { ok, error } = await authRepository.requestEmailChange(
    email,
    redirectTo,
  );
  if (!ok) {
    // l'indirizzo non finisce nei log: solo il codice di errore
    console.error("Richiesta di cambio email non riuscita", error?.code);
    return {
      ok: false,
      reason: error?.code === "email_exists" ? "unavailable" : "failed",
    };
  }
  return {
    ok: true,
    email,
    confirmBoth: EMAIL_CHANGE_DOUBLE_CONFIRM && user.email !== null,
  };
}

export type EmailConfirmOutcome = "done" | "partial" | "invalid";

export async function confirmEmailChange(
  tokenHash: string,
): Promise<EmailConfirmOutcome> {
  const result = await authRepository.verifyEmailChange(tokenHash);
  if (!result.ok) return "invalid";
  return result.completed ? "done" : "partial";
}

/** Identificativo di login dell'utente: email se presente, altrimenti cellulare. */
export function loginIdentifierOf(user: {
  email: string | null;
  phone: string | null;
}): LoginIdentifier | null {
  if (user.email) return { email: user.email };
  if (user.phone) return { phone: user.phone };
  return null;
}

/**
 * Cambio password (C-07): la password attuale si verifica con una nuova
 * autenticazione separata; dopo il cambio si chiudono le altre sessioni e
 * resta aperta quella corrente. Un solo esito di errore, generico.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<boolean> {
  const user = await authRepository.getAuthUser();
  const identifier = user ? loginIdentifierOf(user) : null;
  if (!identifier) return false;
  if (!(await authRepository.verifyPassword(identifier, currentPassword))) {
    return false;
  }
  const updated = await authRepository.updatePassword(newPassword);
  if (!updated.ok) {
    console.error("Cambio password non riuscito", updated.error?.code);
    return false;
  }
  const others = await authRepository.signOutOthers();
  if (!others.ok) {
    console.error(
      "Chiusura delle altre sessioni non riuscita",
      others.error?.code,
    );
  }
  return true;
}
