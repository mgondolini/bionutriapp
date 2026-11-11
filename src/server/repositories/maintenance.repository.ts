import "server-only";

import { CLIENT_FILES_BUCKET } from "@/lib/constants/domain";
import { createAdminClient } from "@/lib/supabase/admin";

/*
 * Manutenzione giornaliera (fase 9), chiamata dal cron senza utente: secret
 * key (la RLS non è applicabile). Le funzioni SQL sono eseguibili solo dal
 * ruolo service_role (migrazione 20261029200000_manutenzione.sql).
 */

/** Query leggera: tiene attivo il progetto Supabase del piano gratuito. */
export async function ping(): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("studios").select("id").limit(1);
  if (error) throw error;
}

/** Percorsi degli oggetti di client-files senza riga in client_files, più vecchi di `hours`. */
export async function listOrphanUploads(hours: number): Promise<string[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("list_orphan_client_files", {
    p_older_than_hours: hours,
  });
  if (error) throw error;
  return data ?? [];
}

/** Elimina gli oggetti con l'API di Storage; restituisce quanti sono stati eliminati. */
export async function removeClientFileObjects(
  paths: string[],
): Promise<number> {
  if (paths.length === 0) return 0;
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(CLIENT_FILES_BUCKET)
    .remove(paths);
  if (error) throw error;
  return data.length;
}

/** Elimina gli inviti scaduti da più di `days` giorni; restituisce quanti. */
export async function purgeExpiredInvites(days: number): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("purge_expired_invites", {
    p_older_than_days: days,
  });
  if (error) throw error;
  return data;
}
<<<<<<< Updated upstream
=======

/** Elimina le righe del registro delle notifiche più vecchie di `days` giorni. */
export async function purgeNotificationLog(days: number): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("purge_notification_log", {
    p_older_than_days: days,
  });
  if (error) throw error;
  return data;
}

export type VideoToRecheck = {
  id: string;
  youtubeId: string;
  unavailable: boolean;
};

/** I `limit` video controllati meno di recente (mai controllati prima). */
export async function listVideosToRecheck(
  limit: number,
): Promise<VideoToRecheck[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("videos")
    .select("id, youtube_id, unavailable_at")
    .order("availability_checked_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw error;
  return data.map((row) => ({
    id: row.id,
    youtubeId: row.youtube_id,
    unavailable: row.unavailable_at !== null,
  }));
}

/**
 * Esito del controllo: "Non disponibile" dal primo controllo fallito (la
 * data non si sposta ai controlli successivi), tolto appena YouTube lo
 * riproduce di nuovo.
 */
export async function saveVideoAvailability(
  video: VideoToRecheck,
  available: boolean,
): Promise<void> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("videos")
    .update({
      availability_checked_at: now,
      ...(available
        ? { unavailable_at: null }
        : video.unavailable
          ? {}
          : { unavailable_at: now }),
    })
    .eq("id", video.id);
  if (error) throw error;
}
>>>>>>> Stashed changes
