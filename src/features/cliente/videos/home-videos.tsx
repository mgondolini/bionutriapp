import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";
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
      <SectionTitle
        id="home-videos"
        title={t.home.title}
        aside={home.newCount > 0 ? t.newCount(home.newCount) : undefined}
      />
      <VideoRowLink
        video={video}
        folderName={folder.name}
        meta={formatDayMonthLong(video.createdAt)}
        className="rounded-2xl border"
      />
      <Link
        href={ROUTES.client.videos}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-12 rounded-xl",
        )}
      >
        {t.home.all}
      </Link>
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
      <ul className="flex flex-col divide-y divide-muted overflow-hidden rounded-2xl border bg-card">
        {videos.map(({ video, folder }) => (
          <li key={video.id}>
            <VideoRowLink video={video} folderName={folder.name} />
          </li>
        ))}
      </ul>
    </section>
  );
}
