import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import type {
  ClientVideo,
  ClientVideoHome,
} from "@/server/services/videos.service";

import { SectionTitle, VideoRowLink } from "./video-parts";
import { formatDayMonthLong } from "@/lib/format";

const t = copy.client.videos;

/** Blocco Video della home (mockup v4, C5): l'ultimo video e "Tutti i video". */
export function HomeVideos({ home }: { home: ClientVideoHome }) {
  if (!home.latest) return null;
  const { video, folder } = home.latest;
  return (
    <section aria-labelledby="home-videos" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="home-videos"
          className="flex items-baseline gap-1.5 text-[17px] font-bold"
        >
          {t.home.title}
          {home.newCount > 0 ? (
            <span className="text-[13px] font-medium text-muted-foreground before:mr-1 before:content-['·']">
              {t.newCount(home.newCount)}
            </span>
          ) : null}
        </h2>
        <Link
          href={ROUTES.client.videos}
          className="-mr-1 inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-1 text-[15px] font-semibold text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {t.home.all}
          <ChevronRight aria-hidden="true" className="size-[18px]" />
        </Link>
      </div>
      <VideoRowLink
        video={video}
        folderName={folder.name}
        meta={formatDayMonthLong(video.createdAt)}
        className="rounded-[20px] border"
      />
    </section>
  );
}

/**
 * "Intanto guarda" nella home in Onboarding (mockup v4, C4): i video delle
 * cartelle visibili anche in Onboarding (per la RLS sono gli unici che vede).
 */
export function OnboardingVideos({
  videos,
}: {
  videos: { video: ClientVideo; folder: { name: string } }[];
}) {
  if (videos.length === 0) return null;
  return (
    <section
      aria-labelledby="onboarding-videos"
      className="flex flex-col gap-2.5"
    >
      <SectionTitle
        id="onboarding-videos"
        title={t.onboarding.title}
        aside={t.videoCount(videos.length)}
      />
      <ul className="flex flex-col divide-y divide-muted overflow-hidden rounded-[20px] border bg-card">
        {videos.map(({ video, folder }) => (
          <li key={video.id}>
            <VideoRowLink video={video} folderName={folder.name} />
          </li>
        ))}
      </ul>
    </section>
  );
}
