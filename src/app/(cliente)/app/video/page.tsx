import { Clapperboard } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { VideoThumbnail } from "@/components/shared/video-thumbnail";
import { buttonVariants } from "@/components/ui/button";
import { ClientPageHeader } from "@/features/cliente/client-header";
import {
  FolderGrid,
  FolderPill,
  NewBadge,
  SectionTitle,
} from "@/features/cliente/videos/video-parts";
import { ROUTES, videoPath } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatLongDate } from "@/lib/format";
import { getClientVideoHome } from "@/server/services/videos.service";
import { requireClient } from "@/server/services/session.service";

const t = copy.client.videos;

/**
 * Sezione Video (mockup v4, C14): ultimo video aggiunto in evidenza e
 * cartelle in griglia; senza video lo stato vuoto (C18). In Onboarding la
 * RLS mostra solo le cartelle "anche in Onboarding".
 */
export default async function VideosPage() {
  const { studio } = await requireClient();
  const home = await getClientVideoHome();

  return (
    <div className="flex flex-col gap-5">
      <ClientPageHeader title={t.title} />
      {home.videoCount === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title={t.empty.title}
          description={t.empty.description}
          action={
            <Link href={ROUTES.client.home} className={buttonVariants()}>
              {t.empty.back}
            </Link>
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t.subtitle(studio.name)}
          </p>
          {home.latest ? (
            <section
              aria-labelledby="video-latest"
              className="flex flex-col gap-2.5"
            >
              <SectionTitle id="video-latest" title={t.latest} />
              <Link
                href={videoPath(home.latest.folder.id, home.latest.video.id)}
                className="flex flex-col overflow-hidden rounded-[18px] border bg-card transition-colors hover:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <VideoThumbnail
                  youtubeId={home.latest.video.youtubeId}
                  className="w-full rounded-none shadow-none"
                />
                <span className="flex flex-col gap-1.5 px-4 pt-3.5 pb-4">
                  <span className="flex items-center justify-between gap-2">
                    <FolderPill name={home.latest.folder.name} />
                    {home.latest.video.isNew ? (
                      <NewBadge>{t.newBadge}</NewBadge>
                    ) : null}
                  </span>
                  <span className="text-[17px] leading-snug font-bold">
                    {home.latest.video.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {t.addedOn(formatLongDate(home.latest.video.createdAt))}
                  </span>
                </span>
              </Link>
            </section>
          ) : null}
          <section
            aria-labelledby="video-folders"
            className="flex flex-col gap-2.5"
          >
            <SectionTitle
              id="video-folders"
              title={t.folders}
              aside={t.foldersSummary(home.folders.length, home.videoCount)}
            />
            <FolderGrid folders={home.folders} />
          </section>
        </>
      )}
    </div>
  );
}
