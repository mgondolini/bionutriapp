import "server-only";

import { PREP_METRIC_FREQUENCY } from "@/lib/constants/domain";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Preparazione della chiamata (C28–C32, A1, A5). Letture e scritture con il
 * client dell'utente: la RLS dà al cliente in Onboarding solo le proprie
 * misure mensili; lo staff legge la vista onboarding_prep_status del
 * proprio studio. I candidati dei promemoria (cron) con la secret key.
 */

const PREP_COLUMNS =
  "client_id, journey_stage, account_status, push_enabled, measures_total, measures_done, measures_sent_at, measures_recorded_on, call_session_id, call_date, call_time, photos_status, photos_count, photos_saved_at, photos_saved_by_role";

/** Stato del cliente della sessione (RPC security definer: solo la propria riga). */
export async function getOwnPrep() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("my_onboarding_prep")
    .select(PREP_COLUMNS)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Stato di un cliente dello studio (staff); null se la RLS non lo mostra. */
export async function getClientPrep(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("onboarding_prep_status")
    .select(PREP_COLUMNS)
    .eq("client_id", clientId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Stato dei clienti in Onboarding dello studio (chip di A1). */
export async function listStudioPrep(studioId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("onboarding_prep_status")
    .select(PREP_COLUMNS)
    .eq("studio_id", studioId)
    .eq("journey_stage", "onboarding");
  if (error) throw error;
  return data;
}

/** Misure di partenza dello studio: tutte le mensili attive, nell'ordine dello studio. */
export async function listPrepMetrics(studioId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("metrics")
    .select("id, key, name, unit, frequency, min_value, max_value, sort_order")
    .eq("studio_id", studioId)
    .eq("is_active", true)
    .eq("frequency", PREP_METRIC_FREQUENCY)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data;
}

/** Registrazioni del cliente per queste misure, dalla più recente. */
export async function listPrepEntries(clientId: string, metricIds: string[]) {
  if (metricIds.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tracking_entries")
    .select("metric_id, value, recorded_on, created_at, updated_at")
    .eq("client_id", clientId)
    .in("metric_id", metricIds)
    .order("recorded_on", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export type SaveMeasuresResult = "ok" | "out_of_range" | "forbidden";

/** Tutte le misure insieme (RPC: o tutte o nessuna, niente doppioni). */
export async function saveOwnMeasures(
  recordedOn: string,
  values: Record<string, number>,
): Promise<SaveMeasuresResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_onboarding_measures", {
    p_recorded_on: recordedOn,
    p_values: values,
  });
  if (!error) return "ok";
  if (error.code === "23514") return "out_of_range";
  if (error.code === "42501") return "forbidden";
  throw error;
}

/** Clienti da avvisare con la chiamata fra `from` e `to` (cron, secret key). */
export async function listReminderCandidates(
  studioId: string,
  from: string,
  to: string,
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("onboarding_prep_candidates", {
    p_studio: studioId,
    p_from: from,
    p_to: to,
  });
  if (error) throw error;
  return data ?? [];
}
