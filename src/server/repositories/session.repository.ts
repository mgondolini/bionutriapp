import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { ContextRow } from "@/lib/auth/user-context";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

/** Id dell'utente autenticato (JWT validato da getClaims), oppure null. */
export async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

/**
 * Ruoli dell'utente corrente secondo il database (RPC my_context).
 * Il proxy passa il proprio client, legato ai cookie della richiesta.
 */
export async function fetchUserContextRows(
  client?: SupabaseClient<Database>,
): Promise<ContextRow[]> {
  const supabase = client ?? (await createClient());
  const { data, error } = await supabase.rpc("my_context");
  if (error) throw error;
  return data ?? [];
}

export async function getStaffMember(studioId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("studio_members")
    .select("display_name, first_name, role")
    .eq("studio_id", studioId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Profilo del cliente corrente (la RLS restituisce solo il proprio, se attivo). */
export async function getOwnClient(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, first_name, last_name, journey_stage")
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
