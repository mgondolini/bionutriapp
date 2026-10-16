import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import type { ClientOrigin } from "@/lib/constants/domain";
import { createClient } from "@/lib/supabase/server";

/** Colonne lette dalla vista client_list (una riga per cliente). */
const CLIENT_LIST_COLUMNS =
  "id, first_name, last_name, phone, email, effective_account_status, journey_stage, last_file_title, last_file_category, last_file_uploaded_at, last_entry_on";

/**
 * Elenco dei clienti dello studio con UNA sola query sulla vista client_list
 * (stato calcolato, fase, ultimo file, ultima misura). Nessuna query per riga.
 *   select … from public.client_list where studio_id = $1
 *   order by last_name, first_name
 */
export async function listClients(studioId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_list")
    .select(CLIENT_LIST_COLUMNS)
    .eq("studio_id", studioId)
    .order("last_name", { ascending: true, nullsFirst: false })
    .order("first_name", { ascending: true });
  if (error) throw error;
  return data;
}

/** Intestazione della scheda cliente; null se non esiste o è di un altro studio (RLS). */
export async function getClientHeader(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients_with_status")
    .select(
      "id, first_name, last_name, effective_account_status, journey_stage, activated_at",
    )
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Cellulari ed email già presenti nello studio (una query), per scartare i duplicati dell'import. */
export async function getStudioContacts(studioId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("phone, email")
    .eq("studio_id", studioId);
  if (error) throw error;
  return data;
}

export type NewClientRow = {
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  birthDate: string | null;
  origin: ClientOrigin;
};

export type InsertResult =
  | { ok: true; ids: string[] }
  | { ok: false; reason: "duplicate_phone" | "duplicate_email" | "duplicate" };

/** Violazione di un indice unico dei clienti, distinta per cellulare o email. */
function duplicateReason(error: PostgrestError): InsertResult | null {
  if (error.code !== "23505") return null;
  const text = `${error.message} ${error.details ?? ""}`;
  if (text.includes("clients_studio_phone_uq"))
    return { ok: false, reason: "duplicate_phone" };
  if (text.includes("clients_studio_email_uq"))
    return { ok: false, reason: "duplicate_email" };
  return { ok: false, reason: "duplicate" };
}

/**
 * Inserisce uno o più clienti con un solo INSERT: è un'unica istruzione SQL,
 * quindi atomica (tutto o niente). Stato 'to_invite' e fase iniziale li
 * impone il trigger del database in base all'origine.
 */
export async function insertClients(
  studioId: string,
  rows: readonly NewClientRow[],
): Promise<InsertResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .insert(
      rows.map((row) => ({
        studio_id: studioId,
        first_name: row.firstName,
        last_name: row.lastName,
        phone: row.phone,
        email: row.email,
        birth_date: row.birthDate,
        origin: row.origin,
      })),
    )
    .select("id");
  if (error) {
    const duplicate = duplicateReason(error);
    if (duplicate) return duplicate;
    throw error;
  }
  return { ok: true, ids: data.map((row) => row.id) };
}
