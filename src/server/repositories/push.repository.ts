import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Sottoscrizioni Web Push.
 *
 * - Dell'utente corrente (registrazione, elenco, eliminazione): client
 *   dell'utente, la RLS limita alle proprie e solo con una sessione valida.
 * - Dei destinatari di una notifica: secret key. L'invio parte dopo la
 *   risposta (after) per conto dello staff, che per la RLS non vede le
 *   sottoscrizioni dei clienti; l'appartenenza del cliente allo studio la
 *   verifica prima files.service.
 */

/** Registra (o riassegna all'utente corrente) la sottoscrizione di questo browser. */
export async function registerOwnSubscription(subscription: {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent: string | null;
}): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("register_push_subscription", {
    p_endpoint: subscription.endpoint,
    p_p256dh: subscription.p256dh,
    p_auth: subscription.auth,
    p_user_agent: subscription.userAgent ?? undefined,
  });
  // sessione non più valida: la RPC rifiuta l'utente
  if (error?.code === "P0001") return false;
  if (error) throw error;
  return true;
}

/** Endpoint dei dispositivi registrati dall'utente corrente. */
export async function listOwnEndpoints(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint");
  if (error) throw error;
  return data.map((row) => row.endpoint);
}

/** Sottoscrizione di questo dispositivo, cercata per endpoint. */
export async function deleteOwnSubscription(endpoint: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint);
  if (error) throw error;
}

/** Tutte le sottoscrizioni dell'utente ("Esci da tutti i dispositivi"). */
export async function deleteAllOwnSubscriptions(userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId);
  if (error) throw error;
}

export type PushTarget = { endpoint: string; p256dh: string; auth: string };

export type ClientPushTargets = {
  accountStatus: string;
  studioName: string;
  subscriptions: PushTarget[];
};

/** Stato, studio e dispositivi di un cliente (secret key: vedi sopra). */
export async function getClientPushTargets(
  clientId: string,
): Promise<ClientPushTargets | null> {
  const supabase = createAdminClient();
  const { data: client, error } = await supabase
    .from("clients")
    .select("account_status, user_id, studios(name)")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw error;
  if (!client) return null;

  let subscriptions: PushTarget[] = [];
  if (client.user_id) {
    const { data, error: subError } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", client.user_id);
    if (subError) throw subError;
    subscriptions = data;
  }
  return {
    accountStatus: client.account_status,
    studioName: client.studios.name,
    subscriptions,
  };
}

/** Elimina le sottoscrizioni scadute (il servizio push ha risposto 404 o 410). */
export async function deleteSubscriptions(endpoints: string[]) {
  if (endpoints.length === 0) return;
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .in("endpoint", endpoints);
  if (error) throw error;
}
