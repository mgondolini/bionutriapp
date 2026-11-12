import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Percorso (migrazione 20261113000000_percorsi.sql).
 *
 * - Staff: client dell'utente, la RLS limita allo studio e i trigger
 *   ricavano studio, cliente e autore; un percorso concluso è in sola
 *   lettura anche per il database.
 * - Cliente: solo le funzioni my_journeys / my_journey_sessions, che non
 *   espongono nota, composizione e check omaggio.
 * - Notifiche e promemoria: secret key (partono dopo la risposta o dal
 *   cron, senza un utente che per la RLS veda dispositivi e registro).
 */

const JOURNEY_COLUMNS =
  "id, client_id, previous_journey_id, kind, duration_months, start_date, end_date, include_onboarding, gift_mode, status, concluded_at, created_at";
const SESSION_COLUMNS =
  "id, journey_id, position, type, calculated_date, custom_date, session_time, status, note";

/** Percorsi del cliente con le sessioni, dal più vecchio. */
export async function listJourneysOfClient(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_journeys")
    .select(`${JOURNEY_COLUMNS}, journey_sessions(${SESSION_COLUMNS})`)
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getJourney(journeyId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("client_journeys")
    .select(
      `${JOURNEY_COLUMNS}, studio_id, journey_sessions(${SESSION_COLUMNS})`,
    )
    .eq("id", journeyId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function hasActiveJourney(clientId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("client_journeys")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("status", "active");
  if (error) throw error;
  return (count ?? 0) > 0;
}

export type NewJourneyRow = {
  clientId: string;
  previousJourneyId: string | null;
  kind: string;
  durationMonths: number;
  startDate: string;
  endDate: string;
  includeOnboarding: boolean;
  giftMode: string;
  sessions: { position: number; type: string; calculated_date: string }[];
};

/** Percorso e sessioni in un'unica transazione (RPC create_client_journey). */
export async function createJourney(
  row: NewJourneyRow,
): Promise<{ ok: true; id: string } | { ok: false; reason: "already_active" }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_client_journey", {
    p_client_id: row.clientId,
    // null per il primo percorso: i tipi generati non lo prevedono, la RPC sì
    p_previous_journey_id: row.previousJourneyId as string,
    p_kind: row.kind,
    p_duration_months: row.durationMonths,
    p_start_date: row.startDate,
    p_end_date: row.endDate,
    p_include_onboarding: row.includeOnboarding,
    p_gift_mode: row.giftMode,
    p_sessions: row.sessions,
  });
  if (error) {
    if (error.code === "23505") return { ok: false, reason: "already_active" };
    throw error;
  }
  return { ok: true, id: data };
}

export async function updateJourneyDates(
  journeyId: string,
  values: { durationMonths: number; startDate: string; endDate: string },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("client_journeys")
    .update({
      duration_months: values.durationMonths,
      start_date: values.startDate,
      end_date: values.endDate,
    })
    .eq("id", journeyId);
  if (error) throw error;
}

/** Ricalcolo: nuove date calcolate, sessioni aggiunte o tolte (al massimo 13). */
export async function applySessionPlan(
  journeyId: string,
  plan: {
    updates: { id: string; calculatedDate: string; type: string }[];
    inserts: { position: number; type: string; calculatedDate: string }[];
    deletes: string[];
  },
) {
  const supabase = await createClient();
  if (plan.deletes.length > 0) {
    const { error } = await supabase
      .from("journey_sessions")
      .delete()
      .in("id", plan.deletes);
    if (error) throw error;
  }
  for (const update of plan.updates) {
    const { error } = await supabase
      .from("journey_sessions")
      .update({ calculated_date: update.calculatedDate, type: update.type })
      .eq("id", update.id);
    if (error) throw error;
  }
  if (plan.inserts.length > 0) {
    const { error } = await supabase.from("journey_sessions").insert(
      plan.inserts.map((session) => ({
        journey_id: journeyId,
        // studio e cliente li scrive il trigger dal percorso
        studio_id: "00000000-0000-0000-0000-000000000000",
        client_id: "00000000-0000-0000-0000-000000000000",
        position: session.position,
        type: session.type,
        calculated_date: session.calculatedDate,
      })),
    );
    if (error) throw error;
  }
}

/** Sessione con il suo percorso; null se non esiste o è di un altro studio. */
export async function getSession(sessionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("journey_sessions")
    .select(
      `${SESSION_COLUMNS}, studio_id, client_id, client_journeys(id, status)`,
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateSession(
  sessionId: string,
  values: {
    customDate: string | null;
    time: string | null;
    status: string;
    note: string | null;
  },
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("journey_sessions")
    .update({
      custom_date: values.customDate,
      session_time: values.time,
      status: values.status,
      note: values.note,
    })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function clearCustomDate(sessionId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("journey_sessions")
    .update({ custom_date: null })
    .eq("id", sessionId);
  if (error) throw error;
}

// ---------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------

export async function listOwnJourneys() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_journeys");
  if (error) throw error;
  return data ?? [];
}

export async function listOwnSessions() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_journey_sessions");
  if (error) throw error;
  return data ?? [];
}

// ---------------------------------------------------------------------
// Notifiche (secret key)
// ---------------------------------------------------------------------

/**
 * Dati per l'avviso di una sessione: cliente, studio, sessioni del percorso
 * (per la numerazione che vede il cliente) e titolare (per il testo).
 */
export async function getSessionNotificationTarget(sessionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("journey_sessions")
    .select(
      "id, journey_id, studio_id, client_id, calculated_date, custom_date, session_time, status, clients(user_id, account_status), studios(name), client_journeys(status, journey_sessions(id, position, type))",
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type JourneyNotificationRow = {
  sessionId: string;
  studioId: string;
  clientId: string;
  kind: "date_changed" | "reminder_day_before" | "reminder_same_day";
  referenceDate: string;
  referenceTime: string | null;
};

/**
 * Registra le notifiche; quelle già presenti (stessa sessione, tipo, data e
 * ora) vengono ignorate. Restituisce le sole righe nuove: le altre sono già
 * state inviate e non si ripetono.
 */
export async function insertNotifications(
  rows: JourneyNotificationRow[],
): Promise<{ id: string; sessionId: string }[]> {
  if (rows.length === 0) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("journey_notifications")
    .upsert(
      rows.map((row) => ({
        session_id: row.sessionId,
        studio_id: row.studioId,
        client_id: row.clientId,
        kind: row.kind,
        reference_date: row.referenceDate,
        reference_time: row.referenceTime,
      })),
      {
        onConflict: "session_id,kind,reference_date,reference_time",
        ignoreDuplicates: true,
      },
    )
    .select("id, session_id");
  if (error) throw error;
  return data.map((row) => ({ id: row.id, sessionId: row.session_id }));
}

export async function completeNotification(
  id: string,
  outcome: "sent" | "partial" | "failed" | "not_delivered",
  errorText: string | null = null,
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("journey_notifications")
    .update({
      outcome,
      error: errorText,
      sent_at:
        outcome === "sent" || outcome === "partial"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", id);
  if (error) throw error;
}

export async function listReminderCandidates(studioId: string, day: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("journey_reminder_candidates", {
    p_studio: studioId,
    p_day: day,
  });
  if (error) throw error;
  return data ?? [];
}
