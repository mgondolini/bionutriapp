import { ExternalLink, MessageSquareQuote } from "lucide-react";
import { notFound } from "next/navigation";
import { z } from "zod";

import { buttonVariants } from "@/components/ui/button";
import { ClientPageHeader } from "@/features/cliente/client-header";
import {
  FolderPill,
  SectionTitle,
  VideoRowLink,
} from "@/features/cliente/videos/video-parts";
import {
  UnavailablePlayer,
  VideoPlayer,
} from "@/features/cliente/videos/video-player";
import { VIDEO_RELATED_LIMIT, videoFolderPath } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { youtubeWatchUrl } from "@/lib/videos/youtube";
import { getClientVideo } from "@/server/services/videos.service";
import { requireClient } from "@/server/services/session.service";

const t = copy.client.videos;

/**
 * Un video (mockup v4, C16): player caricato solo al tocco, titolo,
 * cartella, nota dello studio, link a YouTube e altri video della cartella.
 * Un video segnalato come non disponibile mostra l'errore (C17).
 */
export default async function VideoPage({
  params,
}: PageProps<"/app/video/[cartella]/[video]">) {
  const { studio } = await requireClient();
  const { cartella, video: videoParam } = await params;
  const ids = z
    .object({ folderId: z.uuid(), videoId: z.uuid() })
    .safeParse({ folderId: cartella, videoId: videoParam });
  if (!ids.success) notFound();
  const data = await getClientVideo(
    ids.data.folderId,
    ids.data.videoId,
    VIDEO_RELATED_LIMIT,
  );
  if (!data) notFound();
  const { video, folder, related, relatedCount } = data;
  const unavailable = Boolean(video.unavailableAt);

  return (
    <div className="flex flex-col gap-4">
      <ClientPageHeader
        title={folder.name}
        backHref={videoFolderPath(folder.id)}
        backLabel={t.backToFolder(folder.name)}
      />
      {unavailable ? (
        <UnavailablePlayer />
      ) : (
        <VideoPlayer
          videoId={video.id}
          youtubeId={video.youtubeId}
          title={video.title}
        />
      )}
      <div className="flex flex-col gap-2">
        <span aria-hidden="true" className="h-1 w-9 rounded-full bg-video" />
        <h2 className="text-[21px] leading-tight font-bold tracking-tight">
          {video.title}
        </h2>
        <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
          <FolderPill name={folder.name} />
          <span>{t.addedOn(formatLongDate(video.createdAt))}</span>
        </div>
      </div>
      {unavailable ? (
        <p className="rounded-xl bg-info px-3.5 py-3 text-sm text-info-foreground">
          {t.unavailable.hint}
        </p>
      ) : null}
      {video.note ? (
        <figure className="flex gap-2.5 rounded-xl bg-video-tint px-3.5 py-3 text-sm leading-normal">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-video text-video-ink">
            <MessageSquareQuote aria-hidden="true" className="size-4" />
          </span>
          <div className="flex flex-col gap-0.5">
            <figcaption className="text-xs font-bold text-video-ink">
              {t.noteFrom(studio.name)}
            </figcaption>
            <blockquote className="whitespace-pre-line">
              {t.quotedNote(video.note)}
            </blockquote>
          </div>
        </figure>
      ) : null}
      <a
        href={youtubeWatchUrl(video.youtubeId)}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-12 w-full rounded-xl",
        )}
      >
        <ExternalLink aria-hidden="true" />
        {unavailable ? t.unavailable.youtube : t.openOnYoutube}
      </a>
      {related.length > 0 ? (
        <section
          aria-labelledby="video-related"
          className="flex flex-col gap-2.5"
        >
          <SectionTitle
            id="video-related"
            title={t.sameFolder}
            aside={t.videoCount(relatedCount)}
          />
          <ul className="flex flex-col divide-y divide-muted overflow-hidden rounded-[14px] border bg-card">
            {related.map((item) => (
              <li key={item.id}>
                <VideoRowLink video={item} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
