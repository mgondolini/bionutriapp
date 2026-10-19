import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

/**
 * Nuovo invito (N-01, N-02) con il client dello staff: valgono la RLS e i
 * trigger. Nella stessa transazione il trigger revoca gli inviti precedenti,
 * forza la scadenza a 14 giorni e porta il cliente a "Invito inviato".
 * Si salva SOLO l'hash; `sent_at` registra l'apertura di WhatsApp.
 */
export async function insertInvite(
  clientId: string,
  studioId: string,
  tokenHash: string,
): Promise<
  | { ok: true; expiresAt: string; sentAt: string }
  | { ok: false; reason: "disabled" | "not_found" }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_invites")
    .insert({
      client_id: clientId,
      // ricalcolato comunque dal trigger a partire dal cliente
      studio_id: studioId,
      token_hash: tokenHash,
      sent_at: new Date().toISOString(),
    })
    .select("expires_at, sent_at")
    .single();
  if (error) {
    // trigger prepare_invite: cliente disattivato
    if (error.code === "P0001" && error.message.includes("disattivato")) {
      return { ok: false, reason: "disabled" };
    }
    // RLS (cliente di un altro studio) o cliente inesistente
    if (
      error.code === "42501" ||
      error.message.includes("Cliente non trovato")
    ) {
      return { ok: false, reason: "not_found" };
    }
    throw error;
  }
  return { ok: true, expiresAt: data.expires_at, sentAt: data.sent_at! };
}

/**
 * Invito con cliente e studio a partire dall'hash del token. Pagina pubblica
 * di attivazione: nessun utente autenticato, quindi secret key (la RLS non è
 * applicabile). Si cerca solo per hash: il token in chiaro non arriva qui.
 */
export async function findInviteByHash(tokenHash: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_invites")
    .select(
      "id, expires_at, used_at, revoked_at, client:clients!inner(id, first_name, last_name, phone, email, birth_date, origin, account_status, user_id, studio:studios!inner(name, slug))",
    )
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type ActivationProfile = {
  first_name: string;
  last_name: string | null;
  email: string | null;
  birth_date: string | null;
  privacy_consent: boolean;
};

export type ActivateResult =
  | { ok: true; clientId: string }
  | { ok: false; reason: "invalid" | "duplicate_email" | "conflict" };

/**
 * Attivazione in un'unica transazione (RPC activate_client, solo secret key):
 * l'invito viene segnato come usato solo se ancora utilizzabile (monouso anche
 * con richieste simultanee), poi si collegano utente, dati e fase.
 */
export async function activateClient(
  tokenHash: string,
  userId: string,
  profile: ActivationProfile | null,
): Promise<ActivateResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("activate_client", {
    p_token_hash: tokenHash,
    p_user_id: userId,
    p_profile: (profile ?? undefined) as Json | undefined,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, reason: "duplicate_email" };
    if (error.code === "P0001" && error.message.includes("altro account")) {
      return { ok: false, reason: "conflict" };
    }
    if (error.code === "P0001") return { ok: false, reason: "invalid" };
    throw error;
  }
  return { ok: true, clientId: data };
}
