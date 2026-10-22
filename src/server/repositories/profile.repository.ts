import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ClientEditableField } from "@/lib/constants/domain";

/*
 * Profilo dell'utente corrente (C-07). Sempre con il client dell'utente: le
 * modifiche passano da RPC con l'elenco esplicito dei campi
 * (update_my_client_profile, update_my_member_profile) e il trigger
 * guard_client resta l'ultima barriera.
 */

/** Profilo del cliente corrente (la RLS restituisce solo il proprio). */
export async function getOwnClient(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, first_name, last_name, phone, email, birth_date, activated_at, push_enabled",
    )
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Dati personali del cliente: false se la riga non è visibile (sessione non più valida). */
export async function updateOwnClient(
  update: Record<ClientEditableField, string | null>,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_my_client_profile", {
    p_first_name: update.first_name ?? "",
    p_last_name: update.last_name ?? "",
    // la RPC accetta null (data cancellata); i tipi generati non lo dicono
    p_birth_date: update.birth_date as string,
  });
  if (error?.code === "P0002") return false;
  if (error) throw error;
  return true;
}

/** Riga del professionista corrente nello studio della sessione. */
export async function getOwnMember(studioId: string, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("studio_members")
    .select("title, first_name, last_name, display_name")
    .eq("studio_id", studioId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateOwnMember(values: {
  title: string | null;
  firstName: string;
  lastName: string | null;
}): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_my_member_profile", {
    p_title: values.title ?? "",
    p_first_name: values.firstName,
    p_last_name: values.lastName ?? "",
  });
  if (error?.code === "P0002") return false;
  if (error) throw error;
  return true;
}

/** Vero se nessun altro cliente dello studio usa l'indirizzo (indice unico per studio). */
export async function isEmailAvailable(email: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_email_available", {
    p_email: email,
  });
  if (error) throw error;
  return data;
}
