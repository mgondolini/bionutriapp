import { Folder } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PagedList } from "@/components/shared/paged-list";
import { ClientPageHeader } from "@/features/cliente/client-header";
import {
  FolderGrid,
  SectionTitle,
  VideoRowLink,
} from "@/features/cliente/videos/video-parts";
import {
  ROUTES,
  VIDEOS_PAGE_SIZE,
  VIDEO_FILTER_TO_WATCH,
  VIDEO_PARAMS,
  videoFolderPath,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatDayMonthLong } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getClientVideoFolder } from "@/server/services/videos.service";
import { requireClient } from "@/server/services/session.service";

const t = copy.client.videos;

const searchSchema = z.object({
  [VIDEO_PARAMS.filter]: z
    .literal(VIDEO_FILTER_TO_WATCH)
    .optional()
    .catch(undefined),
});

/**
 * Una cartella (mockup v4, C15): sottocartelle in griglia e video
 * nell'ordine dello studio, con il filtro "Da guardare" (video mai aperti)
 * e la spunta su quelli già aperti.
 */
export default async function VideoFolderPage({
  params,
  searchParams,
}: PageProps<"/app/video/[cartella]">) {
  await requireClient();
  const { cartella } = await params;
  const id = z.uuid().safeParse(cartella);
  if (!id.success) notFound();
  const data = await getClientVideoFolder(id.data);
  if (!data) notFound();
  const toWatch =
    searchSchema.parse(await searchParams)[VIDEO_PARAMS.filter] !== undefined;

  const { folder, parent, subfolders, videos } = data;
  const unseen = videos.filter((video) => !video.viewed);
  const shown = toWatch ? unseen : videos;
  const tabs = [
    { label: t.filter.all(videos.length), active: !toWatch, toWatch: false },
    { label: t.filter.toWatch(unseen.length), active: toWatch, toWatch: true },
  ];

  return (
    <div className="flex flex-col gap-4">
      <ClientPageHeader
        title={folder.name}
        backHref={parent ? videoFolderPath(parent.id) : ROUTES.client.videos}
        backLabel={parent ? t.backToFolder(parent.name) : t.backToVideos}
      />
      <div className="flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-video text-video-ink">
          <Folder aria-hidden="true" className="size-6" />
        </span>
        <p className="flex-1 text-sm text-muted-foreground">
          {folder.description ?? t.videoCount(folder.videoCount)}
        </p>
      </div>

      {subfolders.length > 0 ? (
        <section
          aria-labelledby="video-subfolders"
          className="flex flex-col gap-2.5"
        >
          <SectionTitle id="video-subfolders" title={t.subfolders} />
          <FolderGrid folders={subfolders} />
        </section>
      ) : null}

      {videos.length > 0 ? (
        <>
          <nav
            aria-label={t.filter.label}
            className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1"
          >
            {tabs.map((tab) => (
              <Link
                key={tab.label}
                href={videoFolderPath(folder.id, tab.toWatch)}
                replace
                scroll={false}
                aria-current={tab.active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center justify-center rounded-[9px] text-sm font-semibold focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  tab.active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-secondary-foreground hover:bg-card/60",
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
          {shown.length === 0 ? (
            <p className="rounded-[14px] border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
              {t.emptyFilter}
            </p>
          ) : (
            <PagedList
              // un nuovo filtro riparte dalla prima pagina
              key={toWatch ? "da-guardare" : "tutti"}
              pageSize={VIDEOS_PAGE_SIZE}
              className="flex flex-col divide-y divide-muted overflow-hidden rounded-[14px] border bg-card"
              items={shown.map((video) => (
                <li key={video.id}>
                  <VideoRowLink
                    video={video}
                    meta={formatDayMonthLong(video.createdAt)}
                  />
                </li>
              ))}
            />
          )}
          <p className="text-xs text-muted-foreground">{t.listFooter}</p>
        </>
      ) : null}
    </div>
  );
}
