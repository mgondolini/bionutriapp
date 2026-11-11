import { Check, ChevronRight, Folder } from "lucide-react";
import Link from "next/link";

import { VideoThumbnail } from "@/components/shared/video-thumbnail";
import { videoFolderPath, videoPath } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";
import type {
  ClientFolder,
  ClientVideo,
} from "@/server/services/videos.service";

const t = copy.client.videos;

/** Badge Menta "Nuovo" (o "2 nuovi"), testo Profondo. */
export function NewBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full bg-mint px-2.5 py-1 text-[12px] leading-none font-bold text-mint-foreground">
      {children}
    </span>
  );
}

/** Pillola Lavanda con il nome della cartella. */
export function FolderPill({ name }: { name: string }) {
  return (
    <span className="inline-flex self-start rounded-full bg-video px-2.5 py-1 text-[12px] leading-none font-bold text-foreground">
      {name}
    </span>
  );
}

/**
 * Riga di un video (C15, C16, C4, C5): tutta la riga apre il video. A destra
 * "Nuovo" finché non è aperto, la spunta se è già stato aperto.
 */
export function VideoRowLink({
  video,
  meta,
  folderName,
  className,
}: {
  video: ClientVideo;
  meta?: string;
  /** Cartella mostrata sopra il titolo (home e Onboarding). */
  folderName?: string;
  className?: string;
}) {
  return (
    <Link
      href={videoPath(video.folderId, video.id)}
      className={cn(
        "flex min-h-21 items-center gap-3 bg-card px-3 py-2.5 transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset",
        className,
      )}
    >
      <VideoThumbnail youtubeId={video.youtubeId} className="w-[116px]" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        {folderName ? <FolderPill name={folderName} /> : null}
        <span className="line-clamp-2 text-[14.5px] leading-snug font-semibold break-words">
          {video.title}
        </span>
        {meta ? (
          <span className="text-[12.5px] text-muted-foreground">{meta}</span>
        ) : null}
      </span>
      {video.isNew ? (
        <NewBadge>{t.newBadge}</NewBadge>
      ) : video.viewed ? (
        <span
          role="img"
          aria-label={t.viewedAria}
          className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-tint text-foreground"
        >
          <Check aria-hidden="true" className="size-3.5" />
        </span>
      ) : (
        <ChevronRight
          aria-hidden="true"
          className="size-5 shrink-0 text-secondary-foreground"
        />
      )}
    </Link>
  );
}

/** Griglia delle cartelle (C14) o delle sottocartelle (C15), sulla Lavanda. */
export function FolderGrid({ folders }: { folders: ClientFolder[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3">
      {folders.map((folder) => (
        <li key={folder.id}>
          <Link
            href={videoFolderPath(folder.id)}
            className="flex h-full min-h-33 flex-col gap-1 rounded-2xl border border-video bg-video-tint p-3.5 transition-colors hover:bg-video/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="mb-2 flex items-start justify-between gap-2">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-video-ink">
                <Folder aria-hidden="true" className="size-5" />
              </span>
              {folder.newCount > 0 ? (
                <NewBadge>{t.newCount(folder.newCount)}</NewBadge>
              ) : null}
            </span>
            <span className="text-[15px] leading-tight font-bold break-words">
              {folder.name}
            </span>
            <span className="text-[12.5px] text-muted-foreground">
              {t.videoCount(folder.videoCount)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Intestazione di una sezione: titolo a sinistra, conteggio a destra (`.msec`). */
export function SectionTitle({
  id,
  title,
  aside,
}: {
  id: string;
  title: string;
  aside?: string;
}) {
  return (
    <h2
      id={id}
      className="flex items-baseline justify-between gap-3 text-[17px] font-bold"
    >
      {title}
      {aside ? (
        <span className="text-[13px] font-medium text-muted-foreground">
          {aside}
        </span>
      ) : null}
    </h2>
  );
}
