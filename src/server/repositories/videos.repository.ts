import "server-only";

import { createClient } from "@/lib/supabase/server";

/*
 * Libreria video (mockup v4). Sempre il client dell'utente: la RLS mostra
 * allo staff tutto il proprio studio e al cliente solo le cartelle visibili
 * (account attivo; in Onboarding solo quelle "anche in Onboarding"). Il
 * riordino passa da RPC security invoker che riscrivono un livello intero.
 */

export type FolderRow = {
  id: string;
  parentId: string | null;
  name: string;
  description: string | null;
  visibleInOnboarding: boolean;
  sortOrder: number;
};

export type VideoRow = {
  id: string;
  folderId: string;
  youtubeId: string;
  title: string;
  note: string | null;
  sortOrder: number;
  createdAt: string;
  unavailableAt: string | null;
};

const FOLDER_COLUMNS =
  "id, parent_id, name, description, visible_in_onboarding, sort_order";
const VIDEO_COLUMNS =
  "id, folder_id, youtube_id, title, note, sort_order, created_at, unavailable_at";

type FolderDb = {
  id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  visible_in_onboarding: boolean;
  sort_order: number;
};
type VideoDb = {
  id: string;
  folder_id: string;
  youtube_id: string;
  title: string;
  note: string | null;
  sort_order: number;
  created_at: string;
  unavailable_at: string | null;
};

const toFolder = (row: FolderDb): FolderRow => ({
  id: row.id,
  parentId: row.parent_id,
  name: row.name,
  description: row.description,
  visibleInOnboarding: row.visible_in_onboarding,
  sortOrder: row.sort_order,
});

const toVideo = (row: VideoDb): VideoRow => ({
  id: row.id,
  folderId: row.folder_id,
  youtubeId: row.youtube_id,
  title: row.title,
  note: row.note,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  unavailableAt: row.unavailable_at,
});

/** Tutte le cartelle visibili all'utente (una sola query). */
export async function listFolders(): Promise<FolderRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("video_folders")
    .select(FOLDER_COLUMNS)
    .order("sort_order");
  if (error) throw error;
  return data.map(toFolder);
}

/** Tutti i video visibili all'utente, nell'ordine dello studio. */
export async function listVideos(): Promise<VideoRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("videos")
    .select(VIDEO_COLUMNS)
    .order("sort_order");
  if (error) throw error;
  return data.map(toVideo);
}

/** Quanti clienti hanno avviato ogni video (staff: "Aperto da"). */
export async function countViewsByVideo(
  videoIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (videoIds.length === 0) return counts;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("video_views")
    .select("video_id")
    .in("video_id", videoIds);
  if (error) throw error;
  for (const row of data) {
    counts.set(row.video_id, (counts.get(row.video_id) ?? 0) + 1);
  }
  return counts;
}

/** Video già avviati dal cliente della sessione. */
export async function listOwnViewedVideoIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("video_views").select("video_id");
  if (error) throw error;
  return new Set(data.map((row) => row.video_id));
}

/**
 * Clienti con account attivo dello studio che vedono i nuovi video: In
 * percorso e, per le cartelle "anche in Onboarding", in Onboarding (In pausa
 * e Concluso vedono solo i video caricati prima dell'uscita dal percorso).
 */
export async function countActiveClientsByStage(studioId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("journey_stage")
    .eq("studio_id", studioId)
    .eq("account_status", "active")
    .in("journey_stage", ["in_progress", "onboarding"]);
  if (error) throw error;
  return {
    inProgress: data.filter((row) => row.journey_stage === "in_progress")
      .length,
    onboarding: data.filter((row) => row.journey_stage === "onboarding").length,
  };
}

export async function insertFolder(row: {
  studioId: string;
  parentId: string | null;
  name: string;
  description: string | null;
  visibleInOnboarding: boolean;
}): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("video_folders")
    .insert({
      studio_id: row.studioId,
      parent_id: row.parentId,
      name: row.name,
      description: row.description,
      visible_in_onboarding: row.visibleInOnboarding,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

/** false se la cartella non esiste o la RLS non la mostra. */
export async function updateFolder(
  folderId: string,
  fields: {
    name: string;
    description: string | null;
    visibleInOnboarding: boolean;
  },
): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("video_folders")
    .update({
      name: fields.name,
      description: fields.description,
      visible_in_onboarding: fields.visibleInOnboarding,
    })
    .eq("id", folderId)
    .select("id");
  if (error) throw error;
  return data.length > 0;
}

/** "not_empty": la cartella ha ancora video o sottocartelle (vincolo restrict). */
export async function deleteFolder(
  folderId: string,
): Promise<"ok" | "not_found" | "not_empty"> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("video_folders")
    .delete()
    .eq("id", folderId)
    .select("id");
  if (error?.code === "23503") return "not_empty";
  if (error) throw error;
  return data.length > 0 ? "ok" : "not_found";
}

/** "duplicate": lo stesso video è già nella cartella. */
export async function insertVideo(row: {
  studioId: string;
  folderId: string;
  youtubeId: string;
  title: string;
  note: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; reason: "duplicate" }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("videos")
    .insert({
      folder_id: row.folderId,
      youtube_id: row.youtubeId,
      title: row.title,
      note: row.note,
      // ricalcolato comunque dal trigger a partire dalla cartella
      studio_id: row.studioId,
    })
    .select("id")
    .single();
  if (error?.code === "23505") return { ok: false, reason: "duplicate" };
  if (error) throw error;
  return { ok: true, id: data.id };
}

export async function updateVideo(
  videoId: string,
  fields: { title: string; folderId: string; note: string | null },
): Promise<"ok" | "not_found" | "duplicate"> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("videos")
    .update({
      title: fields.title,
      folder_id: fields.folderId,
      note: fields.note,
    })
    .eq("id", videoId)
    .select("id");
  if (error?.code === "23505") return "duplicate";
  if (error) throw error;
  return data.length > 0 ? "ok" : "not_found";
}

export async function deleteVideo(videoId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("videos")
    .delete()
    .eq("id", videoId)
    .select("id");
  if (error) throw error;
  return data.length > 0;
}

/** "stale": l'elenco nel database non coincide con quello inviato. */
export async function reorderFolders(
  parentId: string | null,
  ids: string[],
): Promise<"ok" | "stale"> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_video_folders", {
    // null = cartelle di primo livello
    p_parent: parentId as string,
    p_ids: ids,
  });
  if (error?.code === "P0002" || error?.code === "P0001") return "stale";
  if (error) throw error;
  return "ok";
}

export async function reorderVideos(
  folderId: string,
  ids: string[],
): Promise<"ok" | "stale"> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reorder_videos", {
    p_folder: folderId,
    p_ids: ids,
  });
  if (error?.code === "P0002") return "stale";
  if (error) throw error;
  return "ok";
}

/** Primo avvio di un video da parte del cliente della sessione. */
export async function recordOwnView(videoId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_video_view", {
    p_video: videoId,
  });
  if (error?.code === "P0001") return false;
  if (error) throw error;
  return true;
}
