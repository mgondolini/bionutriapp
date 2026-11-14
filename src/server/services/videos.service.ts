import "server-only";

import { dayInRome } from "@/lib/format";
import {
  buildFolderTree,
  isNewForClient,
  isRecentVideo,
} from "@/lib/videos/library";
import { oembedOutcome, parseYouTubeId } from "@/lib/videos/youtube";
import * as videosRepository from "@/server/repositories/videos.repository";
import type {
  FolderRow,
  VideoRow,
} from "@/server/repositories/videos.repository";
import * as youtubeRepository from "@/server/repositories/youtube.repository";
import { notifyNewVideo } from "@/server/services/notifications.service";
import type {
  AddVideoData,
  CreateFolderData,
  UpdateFolderData,
  UpdateVideoData,
} from "@/server/validation/videos.schema";

/*
 * Libreria video dello studio (mockup v4). Una sola lettura di cartelle e
 * video per schermata; albero, conteggi e "nuovi" sono calcolati qui con le
 * funzioni pure di src/lib/videos. La RLS decide cosa vede ognuno: lo staff
 * tutto il proprio studio, il cliente solo le cartelle per la sua fase.
 */

// ---------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------

export type AdminFolder = FolderRow & {
  /** Video della cartella, sottocartelle comprese. */
  videoCount: number;
  /** "Anche in Onboarding": della cartella, o della cartella superiore. */
  onboarding: boolean;
};
export type AdminFolderNode = AdminFolder & { children: AdminFolder[] };
export type AdminVideo = VideoRow & { openedBy: number; recent: boolean };

/** Cartella nella scelta del form, con i clienti che la vedono ("Avvisa i clienti"). */
export type FolderOption = { id: string; label: string; audience: number };

export type VideoLibrary = {
  tree: AdminFolderNode[];
  folderCount: number;
  videoCount: number;
  /** Cartelle per la scelta nel form del video ("Cartella › Sottocartella"). */
  folderOptions: FolderOption[];
  selected: {
    folder: AdminFolder;
    parent: AdminFolder | null;
    videos: AdminVideo[];
    /** Clienti che vedono i nuovi video della cartella (In percorso, Onboarding se indicato). */
    audience: number;
  } | null;
};

function withCounts(folders: FolderRow[], videos: VideoRow[]): AdminFolder[] {
  const direct = new Map<string, number>();
  for (const video of videos) {
    direct.set(video.folderId, (direct.get(video.folderId) ?? 0) + 1);
  }
  return folders.map((folder) => {
    const parent = folders.find((f) => f.id === folder.parentId) ?? null;
    const children = folders.filter((f) => f.parentId === folder.id);
    return {
      ...folder,
      videoCount:
        (direct.get(folder.id) ?? 0) +
        children.reduce((sum, child) => sum + (direct.get(child.id) ?? 0), 0),
      onboarding: parent
        ? parent.visibleInOnboarding
        : folder.visibleInOnboarding,
    };
  });
}

/** Libreria per lo staff con la cartella scelta (o la prima). */
export async function getVideoLibrary(
  studioId: string,
  folderId: string | null,
): Promise<VideoLibrary> {
  const [folders, videos, clients] = await Promise.all([
    videosRepository.listFolders(),
    videosRepository.listVideos(),
    videosRepository.countActiveClientsByStage(studioId),
  ]);
  const counted = withCounts(folders, videos);
  const tree = buildFolderTree(counted);
  const audienceOf = (folder: AdminFolder) =>
    clients.inProgress + (folder.onboarding ? clients.onboarding : 0);
  const folderOptions = tree.flatMap((folder) => [
    { id: folder.id, label: folder.name, audience: audienceOf(folder) },
    ...folder.children.map((child) => ({
      id: child.id,
      label: `${folder.name} › ${child.name}`,
      audience: audienceOf(child),
    })),
  ]);

  const folder = counted.find((f) => f.id === folderId) ?? tree[0] ?? null;
  let selected: VideoLibrary["selected"] = null;
  if (folder) {
    const folderVideos = videos.filter((video) => video.folderId === folder.id);
    const views = await videosRepository.countViewsByVideo(
      folderVideos.map((video) => video.id),
    );
    const today = dayInRome();
    selected = {
      folder,
      parent: counted.find((f) => f.id === folder.parentId) ?? null,
      videos: folderVideos.map((video) => ({
        ...video,
        openedBy: views.get(video.id) ?? 0,
        recent: isRecentVideo(video.createdAt, today),
      })),
      audience: audienceOf(folder),
    };
  }
  return {
    tree,
    folderCount: folders.length,
    videoCount: videos.length,
    folderOptions,
    selected,
  };
}

export type CreateFolderResult =
  { ok: true; id: string } | { ok: false; reason: "invalid_parent" };

/** Cartella o sottocartella (solo dentro una cartella di primo livello). */
export async function createFolder(
  studioId: string,
  input: CreateFolderData,
): Promise<CreateFolderResult> {
  if (input.parentId) {
    const parent = (await videosRepository.listFolders()).find(
      (folder) => folder.id === input.parentId,
    );
    if (!parent || parent.parentId) {
      return { ok: false, reason: "invalid_parent" };
    }
  }
  const id = await videosRepository.insertFolder({
    studioId,
    parentId: input.parentId,
    name: input.name,
    description: input.description,
    // la sceglie solo la cartella: le sottocartelle seguono la superiore
    visibleInOnboarding: !input.parentId && input.visibility === "onboarding",
  });
  return { ok: true, id };
}

export function updateFolder(input: UpdateFolderData): Promise<boolean> {
  return videosRepository.updateFolder(input.folderId, {
    name: input.name,
    description: input.description,
    visibleInOnboarding: input.visibility === "onboarding",
  });
}

export function deleteFolder(folderId: string) {
  return videosRepository.deleteFolder(folderId);
}

export type LinkCheck =
  | {
      ok: true;
      youtubeId: string;
      title: string | null;
      authorName: string | null;
    }
  | {
      ok: false;
      reason:
        "invalid_link" | "not_embeddable" | "unavailable" | "check_failed";
    };

/**
 * Verifica del link (A14, A15): solo YouTube, poi oEmbed sul server. Un
 * video privato, rimosso o non incorporabile non si aggiunge.
 */
export async function checkVideoLink(url: string): Promise<LinkCheck> {
  const youtubeId = parseYouTubeId(url);
  if (!youtubeId) return { ok: false, reason: "invalid_link" };
  const response = await youtubeRepository.fetchOembed(youtubeId);
  if (response.status === "network_error") {
    return { ok: false, reason: "check_failed" };
  }
  const outcome = oembedOutcome(response.status);
  if (outcome !== "ok") return { ok: false, reason: outcome };
  return {
    ok: true,
    youtubeId,
    title: response.title,
    authorName: response.authorName,
  };
}

export type AddVideoResult =
  | { ok: true; id: string }
  | {
      ok: false;
      reason:
        | Extract<LinkCheck, { ok: false }>["reason"]
        | "folder_not_found"
        | "duplicate";
    };

/** Aggiunge un video dopo una nuova verifica del link (non ci si fida del browser). */
export async function addVideo(
  studioId: string,
  input: AddVideoData,
): Promise<AddVideoResult> {
  const folders = await videosRepository.listFolders();
  if (!folders.some((folder) => folder.id === input.folderId)) {
    return { ok: false, reason: "folder_not_found" };
  }
  const check = await checkVideoLink(input.url);
  if (!check.ok) return check;
  const result = await videosRepository.insertVideo({
    studioId,
    folderId: input.folderId,
    youtubeId: check.youtubeId,
    title: input.title,
    note: input.note,
  });
  if (!result.ok) return result;
  if (input.notify) notifyNewVideo(result.id);
  return { ok: true, id: result.id };
}

export async function updateVideo(
  input: UpdateVideoData,
): Promise<"ok" | "not_found" | "duplicate" | "folder_not_found"> {
  const folders = await videosRepository.listFolders();
  if (!folders.some((folder) => folder.id === input.folderId)) {
    return "folder_not_found";
  }
  return videosRepository.updateVideo(input.videoId, {
    title: input.title,
    folderId: input.folderId,
    note: input.note,
  });
}

export function deleteVideo(videoId: string) {
  return videosRepository.deleteVideo(videoId);
}

export function reorderFolders(parentId: string | null, ids: string[]) {
  return videosRepository.reorderFolders(parentId, ids);
}

export function reorderVideos(folderId: string, ids: string[]) {
  return videosRepository.reorderVideos(folderId, ids);
}

// ---------------------------------------------------------------------
// Cliente
// ---------------------------------------------------------------------

export type ClientVideo = VideoRow & { viewed: boolean; isNew: boolean };
export type ClientFolder = FolderRow & {
  videoCount: number;
  newCount: number;
};
export type ClientFolderNode = ClientFolder & { children: ClientFolder[] };

type ClientLibraryData = {
  folders: FolderRow[];
  videos: ClientVideo[];
  tree: ClientFolderNode[];
};

/**
 * Cartelle e video visibili al cliente della sessione. Una cartella vuota
 * (anche contando le sottocartelle) non compare.
 */
async function loadClientLibrary(): Promise<ClientLibraryData> {
  const [folders, videos, viewed] = await Promise.all([
    videosRepository.listFolders(),
    videosRepository.listVideos(),
    videosRepository.listOwnViewedVideoIds(),
  ]);
  const today = dayInRome();
  const clientVideos = videos.map((video) => {
    const seen = viewed.has(video.id);
    return {
      ...video,
      viewed: seen,
      isNew: isNewForClient(
        { createdAt: video.createdAt, viewed: seen },
        today,
      ),
    };
  });
  const counted = folders.map((folder) => {
    const ids = new Set([
      folder.id,
      ...folders.filter((f) => f.parentId === folder.id).map((f) => f.id),
    ]);
    const inFolder = clientVideos.filter((video) => ids.has(video.folderId));
    return {
      ...folder,
      videoCount: inFolder.length,
      newCount: inFolder.filter((video) => video.isNew).length,
    };
  });
  const tree = buildFolderTree(counted)
    .filter((folder) => folder.videoCount > 0)
    .map((folder) => ({
      ...folder,
      children: folder.children.filter((child) => child.videoCount > 0),
    }));
  return { folders, videos: clientVideos, tree };
}

export type ClientVideoHome = {
  folders: ClientFolderNode[];
  videoCount: number;
  newCount: number;
  latest: { video: ClientVideo; folder: FolderRow } | null;
};

/** Sezione Video (C14), blocco della home (C5) e voce del menu (C6). */
export async function getClientVideoHome(): Promise<ClientVideoHome> {
  const { folders, videos, tree } = await loadClientLibrary();
  const newest = [...videos].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  )[0];
  const folder = newest
    ? folders.find((f) => f.id === newest.folderId)
    : undefined;
  return {
    folders: tree,
    videoCount: videos.length,
    newCount: videos.filter((video) => video.isNew).length,
    latest: newest && folder ? { video: newest, folder } : null,
  };
}

export type ClientVideoFolder = {
  folder: ClientFolder;
  parent: FolderRow | null;
  subfolders: ClientFolder[];
  /** Video diretti della cartella, nell'ordine dello studio. */
  videos: ClientVideo[];
};

/** Una cartella (C15); null se non esiste, non è visibile o è vuota. */
export async function getClientVideoFolder(
  folderId: string,
): Promise<ClientVideoFolder | null> {
  const { folders, videos, tree } = await loadClientLibrary();
  const node =
    tree.find((f) => f.id === folderId) ??
    tree.flatMap((f) => f.children).find((f) => f.id === folderId);
  if (!node) return null;
  return {
    folder: node,
    parent: folders.find((f) => f.id === node.parentId) ?? null,
    subfolders: "children" in node ? (node as ClientFolderNode).children : [],
    videos: videos
      .filter((video) => video.folderId === folderId)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export type ClientVideoDetail = {
  video: ClientVideo;
  folder: FolderRow;
  related: ClientVideo[];
  relatedCount: number;
  /** Titolare dello studio, per "Nota del Dott. …" (solo se c'è una nota). */
  staff: { title: string; firstName: string; lastName: string } | null;
};

/** Un video (C16, C17); null se non è nella cartella indicata o non è visibile. */
export async function getClientVideo(
  folderId: string,
  videoId: string,
  relatedLimit: number,
): Promise<ClientVideoDetail | null> {
  const { folders, videos } = await loadClientLibrary();
  const video = videos.find((v) => v.id === videoId && v.folderId === folderId);
  const folder = folders.find((f) => f.id === folderId);
  if (!video || !folder) return null;
  const others = videos
    .filter((v) => v.folderId === folderId && v.id !== videoId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  return {
    video,
    folder,
    related: others.slice(0, relatedLimit),
    relatedCount: others.length,
    staff: video.note ? await videosRepository.getStudioStaffName() : null,
  };
}

/** Video visibili in Onboarding (C4): per la RLS sono tutti quelli che il cliente vede. */
export async function getOnboardingVideos(): Promise<
  { video: ClientVideo; folder: FolderRow }[]
> {
  const { folders, videos } = await loadClientLibrary();
  const tree = buildFolderTree(folders);
  const order = tree.flatMap((f) => [f.id, ...f.children.map((c) => c.id)]);
  return videos
    .sort(
      (a, b) =>
        order.indexOf(a.folderId) - order.indexOf(b.folderId) ||
        a.sortOrder - b.sortOrder,
    )
    .flatMap((video) => {
      const folder = folders.find((f) => f.id === video.folderId);
      return folder ? [{ video, folder }] : [];
    });
}

export function recordView(videoId: string): Promise<boolean> {
  return videosRepository.recordOwnView(videoId);
}
