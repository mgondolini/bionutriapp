import "server-only";

import type {
  FileCategory,
  JourneyStage,
  NotificationType,
} from "@/lib/constants/domain";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/*
 * Registro e preferenze delle notifiche (migrazione 20261106000000_notifiche.sql).
 *
 * - Destinatari, registro e promemoria: secret key. L'invio di un file parte
 *   dopo la risposta per conto dello staff (che per la RLS non vede le
 *   preferenze né il registro dei clienti, e files.service ha già verificato
 *   lo studio); il promemoria parte dal cron, senza utente.
 * - Preferenze dell'utente corrente: client dell'utente, la RLS limita alla
 *   propria riga.
 */

export type NotificationPreferences = {
  filesEnabled: boolean;
  dailyReminderEnabled: boolean;
  videosEnabled: boolean;
};

/** Senza riga valgono i default: tutto attivo. */
export const DEFAULT_PREFERENCES: NotificationPreferences = {
  filesEnabled: true,
  dailyReminderEnabled: true,
  videosEnabled: true,
};

export type FileRecipient = {
  fileId: string;
  category: FileCategory;
  clientId: string;
  studioId: string;
  studioName: string;
  userId: string | null;
  accountStatus: string;
  journeyStage: JourneyStage;
  filesEnabled: boolean;
};

/** Cliente, studio e preferenza di chi riceve l'avviso di un file. */
export async function getFileRecipient(
  fileId: string,
): Promise<FileRecipient | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("client_files")
    .select(
      "id, category, client_id, studio_id, clients(account_status, journey_stage, user_id), studios(name)",
    )
    .eq("id", fileId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  let filesEnabled = DEFAULT_PREFERENCES.filesEnabled;
  if (data.clients.user_id) {
    const { data: prefs, error: prefsError } = await supabase
      .from("notification_preferences")
      .select("files_enabled")
      .eq("user_id", data.clients.user_id)
      .maybeSingle();
    if (prefsError) throw prefsError;
    filesEnabled = prefs?.files_enabled ?? filesEnabled;
  }
  return {
    fileId: data.id,
    category: data.category as FileCategory,
    clientId: data.client_id,
    studioId: data.studio_id,
    studioName: data.studios.name,
    userId: data.clients.user_id,
    accountStatus: data.clients.account_status,
    journeyStage: data.clients.journey_stage as JourneyStage,
    filesEnabled,
  };
}

export type ReminderStudio = { id: string; name: string; timezone: string };

export async function listStudios(): Promise<ReminderStudio[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("studios")
    .select("id, name, timezone");
  if (error) throw error;
  return data;
}

export type ReminderCandidate = {
  clientId: string;
  userId: string;
  habitsDone: boolean;
  workoutDone: boolean;
};

/** Clienti a cui spetta il promemoria del giorno (RPC solo service_role). */
export async function listDailyReminderCandidates(
  studioId: string,
  day: string,
): Promise<ReminderCandidate[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("daily_reminder_candidates", {
    p_studio: studioId,
    p_day: day,
  });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    clientId: row.client_id,
    userId: row.user_id,
    habitsDone: row.habits_done,
    workoutDone: row.workout_done,
  }));
}

export type LogStatus = "queued" | "sent" | "partial" | "failed" | "skipped";

export type NewLogEntry = {
  studioId: string;
  clientId: string;
  userId: string | null;
  type: NotificationType;
  dedupeKey: string;
  payload: Record<string, string>;
  status: "queued" | "skipped";
  skippedReason?: string;
};

/**
 * Inserisce le righe del registro; quelle con una dedupe_key già presente
 * vengono ignorate. Restituisce id e chiave delle sole righe nuove: chi non
 * è tra queste è già stato notificato (o saltato) e non va reinviato.
 */
export async function insertLogEntries(
  entries: NewLogEntry[],
): Promise<{ id: string; dedupeKey: string }[]> {
  if (entries.length === 0) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("notification_log")
    .upsert(
      entries.map((entry) => ({
        studio_id: entry.studioId,
        client_id: entry.clientId,
        user_id: entry.userId,
        type: entry.type,
        dedupe_key: entry.dedupeKey,
        payload: entry.payload,
        status: entry.status,
        skipped_reason: entry.skippedReason ?? null,
      })),
      { onConflict: "dedupe_key", ignoreDuplicates: true },
    )
    .select("id, dedupe_key");
  if (error) throw error;
  return data.map((row) => ({ id: row.id, dedupeKey: row.dedupe_key }));
}

/** Esito finale di una notifica in coda. */
export async function completeLogEntry(
  id: string,
  outcome:
    | { status: "sent" | "partial" }
    | { status: "failed"; error: string }
    | { status: "skipped"; skippedReason: string },
) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("notification_log")
    .update({
      status: outcome.status,
      error: outcome.status === "failed" ? outcome.error : null,
      skipped_reason:
        outcome.status === "skipped" ? outcome.skippedReason : null,
      sent_at:
        outcome.status === "sent" || outcome.status === "partial"
          ? new Date().toISOString()
          : null,
    })
    .eq("id", id);
  if (error) throw error;
}

/** Preferenze dell'utente corrente (default se non ha ancora una riga). */
export async function getOwnPreferences(): Promise<NotificationPreferences> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notification_preferences")
    .select("files_enabled, daily_reminder_enabled, videos_enabled")
    .maybeSingle();
  if (error) throw error;
  return data
    ? {
        filesEnabled: data.files_enabled,
        dailyReminderEnabled: data.daily_reminder_enabled,
        videosEnabled: data.videos_enabled,
      }
    : DEFAULT_PREFERENCES;
}

/** Salva le preferenze dell'utente corrente (upsert sulla propria riga). */
export async function saveOwnPreferences(
  userId: string,
  preferences: NotificationPreferences,
) {
  const supabase = await createClient();
  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: userId,
      files_enabled: preferences.filesEnabled,
      daily_reminder_enabled: preferences.dailyReminderEnabled,
      videos_enabled: preferences.videosEnabled,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export type VideoNotificationTarget = {
  videoId: string;
  folderId: string;
  studioId: string;
  studioName: string;
  recipients: { clientId: string; userId: string }[];
};

/**
 * Video appena pubblicato e clienti da avvisare (secret key: l'invio parte
 * dopo la risposta per conto dello staff, che non vede preferenze e
 * dispositivi dei clienti; lo studio l'ha già verificato videos.service).
 */
export async function getVideoNotificationTarget(
  videoId: string,
): Promise<VideoNotificationTarget | null> {
  const supabase = createAdminClient();
  const { data: video, error } = await supabase
    .from("videos")
    .select("id, folder_id, studio_id, studios(name)")
    .eq("id", videoId)
    .maybeSingle();
  if (error) throw error;
  if (!video) return null;
  const { data: recipients, error: rpcError } = await supabase.rpc(
    "video_notification_recipients",
    { p_video: videoId },
  );
  if (rpcError) throw rpcError;
  return {
    videoId: video.id,
    folderId: video.folder_id,
    studioId: video.studio_id,
    studioName: video.studios.name,
    recipients: (recipients ?? []).map((row) => ({
      clientId: row.client_id,
      userId: row.user_id,
    })),
  };
}
