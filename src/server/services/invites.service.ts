import "server-only";

import type { ClientOrigin } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import {
  evaluateInvite,
  type InviteRecord,
} from "@/lib/invites/activation-state";
import {
  generateInviteToken,
  hashInviteToken,
  isWellFormedToken,
} from "@/lib/invites/token";
import { activationUrl, buildWhatsAppUrl } from "@/lib/invites/whatsapp";
import * as authAdminRepository from "@/server/repositories/auth-admin.repository";
import * as authRepository from "@/server/repositories/auth.repository";
import * as clientsRepository from "@/server/repositories/clients.repository";
import * as invitesRepository from "@/server/repositories/invites.repository";
import type {
  ActivationInput,
  ResetViaInviteInput,
} from "@/server/validation/invites.schema";

/**
 * Inviti su WhatsApp e attivazione dell'account (N-01, N-02, C-08).
 * Il token in chiaro esiste solo in memoria e nel link: non viene mai salvato
 * né scritto nei log; nel database va solo l'hash SHA-256.
 */

function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL non configurato");
  return url;
}

export type CreateInviteResult =
  | { ok: true; whatsappUrl: string; sentAt: string; expiresAt: string }
  | { ok: false; reason: "not_found" | "disabled" };

/**
 * Nuovo invito per un cliente dello studio della sessione: revoca i
 * precedenti (stessa transazione, trigger), registra l'invio e restituisce il
 * link wa.me con il messaggio precompilato (solo nome dello studio e link, N-05).
 */
export async function createInvite(input: {
  clientId: string;
  studioId: string;
  studioName: string;
}): Promise<CreateInviteResult> {
  // RLS + controllo esplicito: il cliente deve essere dello studio della sessione
  const client = await clientsRepository.getClientProfile(input.clientId);
  if (!client || client.studio_id !== input.studioId) {
    return { ok: false, reason: "not_found" };
  }
  if (client.account_status === "disabled") {
    return { ok: false, reason: "disabled" };
  }

  const token = generateInviteToken();
  const inserted = await invitesRepository.insertInvite(
    input.clientId,
    input.studioId,
    hashInviteToken(token),
  );
  if (!inserted.ok) return inserted;

  const text = copy.invites.whatsappMessage(
    input.studioName,
    activationUrl(appUrl(), token),
  );
  return {
    ok: true,
    whatsappUrl: buildWhatsAppUrl(client.phone!, text),
    sentAt: inserted.sentAt,
    expiresAt: inserted.expiresAt,
  };
}

type InviteRow = NonNullable<
  Awaited<ReturnType<typeof invitesRepository.findInviteByHash>>
>;

function toInviteRecord(row: InviteRow | null): InviteRecord | null {
  if (!row) return null;
  return {
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    revokedAt: row.revoked_at,
    client: {
      origin: row.client.origin as ClientOrigin,
      accountStatus: row.client.account_status,
      userId: row.client.user_id,
    },
  };
}

export type ActivationView =
  | { kind: "invalid" }
  | {
      kind: "imported" | "new" | "reset";
      expiresAt: string;
      studio: { name: string; slug: string };
      client: {
        firstName: string;
        lastName: string | null;
        phone: string;
        email: string | null;
        birthDate: string | null;
      };
    };

const INVALID = { kind: "invalid" } as const;

async function loadInvite(token: string) {
  if (!isWellFormedToken(token)) return null;
  const tokenHash = hashInviteToken(token);
  const row = await invitesRepository.findInviteByHash(tokenHash);
  return {
    tokenHash,
    row,
    state: evaluateInvite(toInviteRecord(row), new Date()),
  };
}

/** Cosa mostrare aprendo il link: un unico esito "invalid" per ogni caso non utilizzabile. */
export async function getActivationView(
  token: string,
): Promise<ActivationView> {
  const invite = await loadInvite(token);
  if (!invite || invite.state.kind === "invalid" || !invite.row) return INVALID;
  const { row } = invite;
  return {
    kind: invite.state.kind,
    expiresAt: row.expires_at,
    studio: { name: row.client.studio.name, slug: row.client.studio.slug },
    client: {
      firstName: row.client.first_name,
      lastName: row.client.last_name,
      phone: row.client.phone,
      email: row.client.email,
      birthDate: row.client.birth_date,
    },
  };
}

export type ActivateResult =
  | { ok: true; signedIn: boolean }
  | { ok: false; reason: "invalid" | "duplicate_email" | "error" };

/**
 * Attivazione (C1 e C2):
 *   1. ricalcolo dell'hash e verifica dell'invito;
 *   2. creazione dell'utente Supabase con il cellulare (verificato dall'invito);
 *   3. RPC activate_client: invito usato solo se ancora utilizzabile, collegamento,
 *      dati, consenso e fase, tutto in una transazione;
 *   4. login con cellulare e password.
 * Se il passo 3 fallisce l'utente creato al passo 2 viene eliminato (compensazione).
 * Con due richieste simultanee la seconda si ferma al passo 2 (cellulare già
 * registrato) oppure al passo 3 (invito già usato) e la sua compensazione
 * elimina solo l'utente che ha creato lei.
 */
export async function activate(
  input: ActivationInput,
): Promise<ActivateResult> {
  const invite = await loadInvite(input.token);
  if (
    !invite?.row ||
    (invite.state.kind !== "imported" && invite.state.kind !== "new")
  ) {
    return { ok: false, reason: "invalid" };
  }
  const phone = invite.row.client.phone;

  const created = await authAdminRepository.createUser({
    phone,
    email: input.email,
    password: input.password,
  });
  if (!created.ok) {
    if (created.reason === "email_exists") {
      return { ok: false, reason: "duplicate_email" };
    }
    // cellulare già registrato: richiesta parallela o account preesistente
    return {
      ok: false,
      reason: created.reason === "phone_exists" ? "invalid" : "error",
    };
  }

  let activated: invitesRepository.ActivateResult;
  try {
    activated = await invitesRepository.activateClient(
      invite.tokenHash,
      created.userId,
      {
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        birth_date: input.birthDate,
        privacy_consent: input.consent,
      },
    );
  } catch (error) {
    await compensate(created.userId);
    throw error;
  }
  if (!activated.ok) {
    await compensate(created.userId);
    return {
      ok: false,
      reason:
        activated.reason === "duplicate_email" ? "duplicate_email" : "invalid",
    };
  }

  const signedIn = await authRepository.signInWithPassword(
    { phone },
    input.password,
  );
  return { ok: true, signedIn: signedIn.ok };
}

async function compensate(userId: string) {
  const deleted = await authAdminRepository.deleteUser(userId);
  if (!deleted) {
    // Nessun dato del token nei log: solo l'id dell'utente da eliminare a mano.
    console.error("Compensazione non riuscita: utente da eliminare", userId);
  }
}

export type ResetResult =
  { ok: true; signedIn: boolean } | { ok: false; reason: "invalid" | "error" };

/**
 * Nuovo link a un cliente già attivo (N-02, chi non ha email e ha dimenticato
 * la password): l'invito viene consumato per primo (monouso), poi si imposta
 * la nuova password e si entra.
 */
export async function resetPasswordViaInvite(
  input: ResetViaInviteInput,
): Promise<ResetResult> {
  const invite = await loadInvite(input.token);
  const userId = invite?.row?.client.user_id;
  if (!invite || invite.state.kind !== "reset" || !userId) {
    return { ok: false, reason: "invalid" };
  }

  const used = await invitesRepository.activateClient(
    invite.tokenHash,
    userId,
    null,
  );
  if (!used.ok) return { ok: false, reason: "invalid" };

  const updated = await authAdminRepository.updatePassword(
    userId,
    input.password,
  );
  if (!updated) return { ok: false, reason: "error" };

  const signedIn = await authRepository.signInWithPassword(
    { phone: invite.row!.client.phone },
    input.password,
  );
  return { ok: true, signedIn: signedIn.ok };
}
