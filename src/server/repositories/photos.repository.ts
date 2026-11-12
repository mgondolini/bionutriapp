import "server-only";

import {
  CLIENT_PHOTOS_BUCKET,
  PHOTO_NOTIFICATION_KINDS,
  PHOTO_SIGNED_URL_TTL_SECONDS,
  type PhotoView,
} from "@/lib/constants/domain";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Foto di avanzamento (migrazione 20261117000000_foto.sql). Si usa il
 * client dell'utente: RLS, trigger (apertura il giorno del check, tre viste
 * per salvare, blocco dopo il salvataggio) e policy dello Storage valgono
 * anche qui. Solo i candidati dei promemoria usano la secret key (cron).
 */

const SET_COLUMNS =
  "id, session_id, studio_id, client_id, status, saved_at, saved_by_role";
/** Valore segnaposto: il trigger lo sostituisce con quello della sessione o del set. */
const PLACEHOLDER_ID = "00000000-0000-0000-0000-000000000000";
const PHOTO_COLUMNS =
  "id, view, storage_path, size_bytes, uploaded_by_role, uploaded_at";

/** Set di un cliente con le foto. */
export async function listSetsOfClient(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photo_sets")
    .select(`${SET_COLUMNS}, photos(${PHOTO_COLUMNS})`)
    .eq("client_id", clientId);
  if (error) throw error;
  return data;
}

export async function getSetBySession(sessionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photo_sets")
    .select(`${SET_COLUMNS}, photos(${PHOTO_COLUMNS})`)
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type SetRow = NonNullable<Awaited<ReturnType<typeof getSetBySession>>>;

/** Sessioni dei percorsi di un cliente (staff), con durata e stato del percorso. */
export async function listStaffSessions(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("journey_sessions")
    .select(
      "id, journey_id, studio_id, client_id, position, type, calculated_date, custom_date, session_time, status, client_journeys(duration_months, status, created_at)",
    )
    .eq("client_id", clientId);
  if (error) throw error;
  return data;
}

/** Una sessione (staff) con le sessioni del suo percorso, per la numerazione. */
export async function getStaffSession(sessionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("journey_sessions")
    .select(
      "id, journey_id, studio_id, client_id, position, type, calculated_date, custom_date, status, client_journeys(duration_months, status, journey_sessions(id, position, type))",
    )
    .eq("id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Apre il set se non c'è ancora (il trigger rifiuta un check senza foto o
 * non ancora arrivato). Un set già presente resta com'è.
 */
export async function ensureSet(
  sessionId: string,
): Promise<{ ok: true } | { ok: false; reason: "not_open" | "denied" }> {
  const supabase = await createClient();
  const { error } = await supabase.from("photo_sets").upsert(
    // studio e cliente li scrive il trigger dalla sessione
    {
      session_id: sessionId,
      studio_id: PLACEHOLDER_ID,
      client_id: PLACEHOLDER_ID,
    },
    { onConflict: "session_id", ignoreDuplicates: true },
  );
  if (!error) return { ok: true };
  if (error.code === "23514") return { ok: false, reason: "not_open" };
  if (error.code === "42501") return { ok: false, reason: "denied" };
  throw error;
}

export type PhotoWriteError = "saved" | "denied";

function writeError(code: string | undefined): PhotoWriteError | null {
  if (code === "23514") return "saved";
  if (code === "42501") return "denied";
  return null;
}

export async function insertPhoto(row: {
  setId: string;
  view: PhotoView;
  storagePath: string;
  sizeBytes: number;
}): Promise<"ok" | "duplicate" | PhotoWriteError> {
  const supabase = await createClient();
  const { error } = await supabase.from("photos").insert({
    set_id: row.setId,
    view: row.view,
    storage_path: row.storagePath,
    size_bytes: row.sizeBytes,
    // studio, cliente e autore li riscrive il trigger dal set e dalla sessione
    studio_id: PLACEHOLDER_ID,
    client_id: PLACEHOLDER_ID,
    uploaded_by_role: "client",
  });
  if (!error) return "ok";
  if (error.code === "23505") return "duplicate";
  const known = writeError(error.code);
  if (known) return known;
  throw error;
}

/** Sostituisce l'oggetto di una vista; restituisce il percorso precedente. */
export async function replacePhoto(row: {
  setId: string;
  view: PhotoView;
  storagePath: string;
  sizeBytes: number;
}): Promise<
  | { ok: true; previousPath: string | null }
  | { ok: false; reason: PhotoWriteError }
> {
  const supabase = await createClient();
  const { data: current, error: readError } = await supabase
    .from("photos")
    .select("storage_path")
    .eq("set_id", row.setId)
    .eq("view", row.view)
    .maybeSingle();
  if (readError) throw readError;
  const { data, error } = await supabase
    .from("photos")
    .update({ storage_path: row.storagePath, size_bytes: row.sizeBytes })
    .eq("set_id", row.setId)
    .eq("view", row.view)
    .select("id");
  if (error) {
    const known = writeError(error.code);
    if (known) return { ok: false, reason: known };
    throw error;
  }
  if (data.length === 0) return { ok: false, reason: "denied" };
  return { ok: true, previousPath: current?.storage_path ?? null };
}

/** Elimina la foto di una vista; restituisce il percorso dell'oggetto. */
export async function deletePhoto(
  setId: string,
  view: PhotoView,
): Promise<
  { ok: true; path: string | null } | { ok: false; reason: PhotoWriteError }
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .delete()
    .eq("set_id", setId)
    .eq("view", view)
    .select("storage_path");
  if (error) {
    const known = writeError(error.code);
    if (known) return { ok: false, reason: known };
    throw error;
  }
  return { ok: true, path: data[0]?.storage_path ?? null };
}

/** "Salva le foto": solo da bozza; il trigger controlla le tre viste. */
export async function saveSet(
  setId: string,
): Promise<"ok" | "incomplete" | "not_draft"> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photo_sets")
    .update({ status: "saved" })
    .eq("id", setId)
    .eq("status", "draft")
    .select("id");
  if (error) {
    if (error.code === "23514") return "incomplete";
    throw error;
  }
  return data.length > 0 ? "ok" : "not_draft";
}

/** Date dei promemoria delle foto inviati (scheda dello staff). */
export async function listPhotoReminders(clientId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("journey_notifications")
    .select("session_id, kind, created_at, outcome")
    .eq("client_id", clientId)
    .in("kind", [...PHOTO_NOTIFICATION_KINDS])
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

// ---------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------

/** URL firmato per caricare UN oggetto in quel percorso, senza sovrascrivere. */
export async function createSignedUploadUrl(path: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(CLIENT_PHOTOS_BUCKET)
    .createSignedUploadUrl(path);
  if (error) throw error;
  return data.signedUrl;
}

export async function getObjectInfo(
  path: string,
): Promise<{ size: number } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(CLIENT_PHOTOS_BUCKET)
    .info(path);
  if (error || !data) return null;
  return { size: data.size ?? 0 };
}

/** Primi `length` byte dell'oggetto (richiesta Range). */
export async function readObjectHead(
  path: string,
  length: number,
): Promise<Uint8Array | null> {
  const supabase = await createClient();
  const { data } = await supabase.storage
    .from(CLIENT_PHOTOS_BUCKET)
    .createSignedUrl(path, 60);
  if (!data) return null;
  const response = await fetch(data.signedUrl, {
    headers: { Range: `bytes=0-${length - 1}` },
    cache: "no-store",
  });
  if (!response.ok) return null;
  return new Uint8Array(await response.arrayBuffer()).subarray(0, length);
}

/** Elimina gli oggetti; restituisce l'errore invece di lanciarlo. */
export async function removeObjects(paths: string[]): Promise<Error | null> {
  if (paths.length === 0) return null;
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(CLIENT_PHOTOS_BUCKET)
    .remove(paths);
  return error ?? null;
}

/** URL firmati per mostrare le immagini (NF-02); percorso → URL. */
export async function createSignedUrls(
  paths: string[],
): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(CLIENT_PHOTOS_BUCKET)
    .createSignedUrls(paths, PHOTO_SIGNED_URL_TTL_SECONDS);
  if (error || !data) return new Map();
  const urls = new Map<string, string>();
  for (const item of data) {
    if (item.path && item.signedUrl && !item.error) {
      urls.set(item.path, item.signedUrl);
    }
  }
  return urls;
}

// ---------------------------------------------------------------------
// Promemoria (secret key, cron)
// ---------------------------------------------------------------------

export async function listReminderCandidates(studioId: string, day: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("photo_reminder_candidates", {
    p_studio: studioId,
    p_day: day,
  });
  if (error) throw error;
  return data ?? [];
}
