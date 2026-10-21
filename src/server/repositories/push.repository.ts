import "server-only";

import { createClient } from "@/lib/supabase/server";

/*
 * Sottoscrizioni Web Push dell'utente corrente (la RLS limita alle proprie,
 * con una sessione ancora valida). Registrazione e invio arrivano nella
 * fase 8; qui solo l'eliminazione all'uscita.
 */

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
