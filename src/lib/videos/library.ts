/**
 * Libreria video (mockup v4): albero delle cartelle, video "nuovi",
 * riordino con le frecce. Funzioni pure, condivise da staff e cliente.
 */
import { VIDEO_NEW_DAYS } from "@/lib/constants/domain";
import { daysBetween } from "@/lib/domain/tracking/dates";
import { dayInRome } from "@/lib/format";

export type FolderNode<T extends FolderLike> = T & { children: T[] };

export type FolderLike = {
  id: string;
  parentId: string | null;
  sortOrder: number;
};

const bySortOrder = (a: { sortOrder: number }, b: { sortOrder: number }) =>
  a.sortOrder - b.sortOrder;

/** Cartelle nell'ordine dello studio, ognuna con le sue sottocartelle (un livello). */
export function buildFolderTree<T extends FolderLike>(
  folders: readonly T[],
): FolderNode<T>[] {
  return folders
    .filter((folder) => folder.parentId === null)
    .sort(bySortOrder)
    .map((folder) => ({
      ...folder,
      children: folders
        .filter((child) => child.parentId === folder.id)
        .sort(bySortOrder),
    }));
}

/** Aggiunto da non più di VIDEO_NEW_DAYS giorni (giorno a Roma). */
export function isRecentVideo(createdAt: string, today: string): boolean {
  return daysBetween(dayInRome(createdAt), today) < VIDEO_NEW_DAYS;
}

/** "Nuovo" per il cliente: recente e non ancora aperto. */
export function isNewForClient(
  video: { createdAt: string; viewed: boolean },
  today: string,
): boolean {
  return !video.viewed && isRecentVideo(video.createdAt, today);
}
