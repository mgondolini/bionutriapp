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
      "id, first_name, last_name, origin, effective_account_status, journey_stage, activated_at",
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

/** Colonne della scheda Profilo (A-06, A-07). */
const CLIENT_PROFILE_COLUMNS =
  "id, studio_id, first_name, last_name, phone, email, birth_date, origin, account_status, effective_account_status, journey_stage, activated_at, push_enabled, user_id, created_at, last_invite_created_at, last_invite_sent_at, last_invite_expires_at, last_invite_used_at";

/** Scheda Profilo; null se il cliente non esiste o è di un altro studio (RLS). */
export async function getClientProfile(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients_with_status")
    .select(CLIENT_PROFILE_COLUMNS)
    .eq("id", clientId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Storico delle fasi (ST-04), dal più recente, con il nome dell'autore. */
export async function listStageHistory(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_stage_history")
    .select("id, from_stage, to_stage, changed_at, source, changed_by_name")
    .eq("client_id", clientId)
    .order("changed_at", { ascending: false });
  if (error) throw error;
  return data;
}

export type ClientDataUpdate = {
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  birthDate: string | null;
};

export type UpdateResult =
  | { ok: true }
  | {
      ok: false;
      reason: "duplicate_phone" | "duplicate_email" | "duplicate" | "not_found";
    };

/** Modifica dei dati anagrafici (client dello staff: RLS e trigger attivi). */
export async function updateClientData(
  clientId: string,
  data: ClientDataUpdate,
): Promise<UpdateResult> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("clients")
    .update({
      first_name: data.firstName,
      last_name: data.lastName,
      phone: data.phone,
      email: data.email,
      birth_date: data.birthDate,
    })
    .eq("id", clientId)
    .select("id");
  if (error) {
    const duplicate = duplicateReason(error);
    if (duplicate && !duplicate.ok) return duplicate;
    throw error;
  }
  return rows.length === 1 ? { ok: true } : { ok: false, reason: "not_found" };
}

/**
 * Cambio di fase tramite RPC set_journey_stage: aggiorna solo se la fase è
 * ancora `from` (false = cambiata nel frattempo o cliente non visibile).
 * `automatic` = cambio del sistema (v2.0), registrato senza autore.
 */
export async function setJourneyStage(
  clientId: string,
  from: string,
  to: string,
  automatic = false,
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("set_journey_stage", {
    p_client_id: clientId,
    p_from: from,
    p_to: to,
    p_automatic: automatic,
  });
  if (error) throw error;
  return data;
}

/** Stato dell'account salvato (disattivazione e riattivazione). */
export async function setAccountStatus(
  clientId: string,
  status: "active" | "to_invite" | "invited" | "disabled",
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .update({ account_status: status })
    .eq("id", clientId)
    .select("id");
  if (error) throw error;
  return data.length === 1;
}
