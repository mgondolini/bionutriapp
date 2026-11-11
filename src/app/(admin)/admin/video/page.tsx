import { Suspense } from "react";
import { z } from "zod";

import { PageLoading } from "@/components/shared/page-states";
import { VideoLibrary } from "@/features/admin/videos/video-library";
import { VIDEO_PARAMS } from "@/lib/constants/domain";
import { getVideoLibrary } from "@/server/services/videos.service";
import { requireStaff } from "@/server/services/session.service";

/** `?cartella=`: un id non valido vale come nessuna scelta (la prima cartella). */
const paramsSchema = z.object({
  [VIDEO_PARAMS.folder]: z.uuid().optional().catch(undefined),
});

/** Cartella scelta dall'URL: dato della richiesta, quindi dietro Suspense. */
async function Library({
  searchParams,
}: Pick<PageProps<"/admin/video">, "searchParams">) {
  const session = await requireStaff();
  const params = paramsSchema.parse(await searchParams);
  const library = await getVideoLibrary(
    session.studio.id!,
    params[VIDEO_PARAMS.folder] ?? null,
  );
  return <VideoLibrary library={library} />;
}

/** Libreria video dello studio (mockup v4, A13–A16). */
export default function VideosPage({
  searchParams,
}: PageProps<"/admin/video">) {
  return (
    // data-admin-page: sfondo della pagina dal token --admin-page (AdminFrame)
    <div data-admin-page className="flex flex-col gap-6">
      <Suspense fallback={<PageLoading />}>
        <Library searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
