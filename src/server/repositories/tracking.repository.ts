import "server-only";

import type { PostgrestError } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

/*
 * Tracking (T-01…T-09, A-12, A-13). Si usa sempre il client dell'utente:
 * la RLS limita lo staff al proprio studio e il cliente alle proprie
 * registrazioni (scrittura solo In percorso); il trigger
 * validate_tracking_entry controlla limiti, interi, data non futura a Roma.
 */

const METRIC_COLUMNS =
  "id, key, name, unit, value_type, frequency, min_value, max_value, icon, instructions, sort_order, default_goal, goal_unit";
const ENTRY_COLUMNS = "id, metric_id, value, recorded_on, note, created_at";

/** Misure attive dello studio, nell'ordine dello studio. */
export async function listMetrics(studioId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("metrics")
    .select(METRIC_COLUMNS)
    .eq("studio_id", studioId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

/** Obiettivi personali del cliente (T-07). */
export async function listGoals(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_metric_goals")
    .select("metric_id, goal_value")
    .eq("client_id", clientId);
  if (error) throw error;
  return data;
}

/**
 * TUTTE le registrazioni del cliente con UNA sola query; i calcoli li fanno
 * le funzioni pure di src/lib/domain/tracking (niente query per misura).
 *   select … from tracking_entries where client_id = $1
 *   order by recorded_on desc, created_at desc
 */
export async function listEntries(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tracking_entries")
    .select(ENTRY_COLUMNS)
    .eq("client_id", clientId)
    .order("recorded_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

/** Una registrazione con il cliente; null se non esiste o la RLS non la mostra. */
export async function getEntry(entryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tracking_entries")
    .select(`${ENTRY_COLUMNS}, client_id`)
    .eq("id", entryId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Esito di una scrittura:
 * - `out_of_range`: rifiutata dal trigger (limiti, interi, data futura);
 * - `duplicate`: esiste già il valore del giorno di un'abitudine;
 * - `forbidden`: la RLS non consente la scrittura (fase non In percorso)
 *   oppure la riga non è visibile.
 */
export type WriteResult = "ok" | "out_of_range" | "duplicate" | "forbidden";

function toWriteResult(error: PostgrestError | null): WriteResult {
  if (!error) return "ok";
  if (error.code === "23514") return "out_of_range";
  if (error.code === "23505") return "duplicate";
  if (error.code === "42501" || error.code === "P0002") return "forbidden";
  throw error;
}

export type NewEntryRow = {
  studioId: string;
  clientId: string;
  metricId: string;
  value: number;
  recordedOn: string;
  note: string | null;
};

export async function insertEntry(row: NewEntryRow): Promise<WriteResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("tracking_entries").insert({
    // ricalcolato comunque dal trigger a partire dal cliente
    studio_id: row.studioId,
    client_id: row.clientId,
    metric_id: row.metricId,
    value: row.value,
    recorded_on: row.recordedOn,
    note: row.note,
  });
  return toWriteResult(error);
}

export async function updateEntry(
  entryId: string,
  values: { value: number; recordedOn?: string; note: string | null },
): Promise<WriteResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tracking_entries")
    .update({
      value: values.value,
      note: values.note,
      ...(values.recordedOn ? { recorded_on: values.recordedOn } : {}),
    })
    .eq("id", entryId)
    .select("id");
  const result = toWriteResult(error);
  // la RLS di update nasconde la riga invece di dare errore
  return result === "ok" && data?.length === 0 ? "forbidden" : result;
}

export async function deleteEntry(entryId: string): Promise<WriteResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tracking_entries")
    .delete()
    .eq("id", entryId)
    .select("id");
  const result = toWriteResult(error);
  return result === "ok" && data?.length === 0 ? "forbidden" : result;
}

/**
 * Check-in giornaliero (T-06): i voti del giorno in un'unica istruzione
 * (RPC save_daily_checkin): tutti salvati o nessuno.
 */
export async function saveDailyCheckin(
  clientId: string,
  recordedOn: string,
  values: Record<string, number>,
): Promise<WriteResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_daily_checkin", {
    p_client_id: clientId,
    p_recorded_on: recordedOn,
    p_values: values,
  });
  return toWriteResult(error);
}

/**
 * Obiettivi personali (T-07), solo staff: inserimento o modifica in una sola
 * istruzione (vincolo unico client_id + metric_id); il trigger
 * validate_metric_goal ammette solo le abitudini dello studio del cliente.
 */
export async function upsertGoals(
  rows: {
    studioId: string;
    clientId: string;
    metricId: string;
    goalValue: number;
  }[],
) {
  if (rows.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase.from("client_metric_goals").upsert(
    rows.map((row) => ({
      // ricalcolato comunque dal trigger a partire dal cliente
      studio_id: row.studioId,
      client_id: row.clientId,
      metric_id: row.metricId,
      goal_value: row.goalValue,
    })),
    { onConflict: "client_id,metric_id" },
  );
  if (error) throw error;
}

/** "Ripristina predefinito": senza obiettivo personale vale quello dello studio. */
export async function deleteGoals(clientId: string, metricIds: string[]) {
  if (metricIds.length === 0) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_metric_goals")
    .delete()
    .eq("client_id", clientId)
    .in("metric_id", metricIds);
  if (error) throw error;
}
