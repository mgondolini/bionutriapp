import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PhotosSkeleton } from "@/components/shared/photos/photos-skeleton";
import { PhotosTab } from "@/features/admin/photos/photos-tab";
import { getClientHeader } from "@/server/services/clients.service";
import { getStaffPhotos } from "@/server/services/photos.service";
import { requireStaff } from "@/server/services/session.service";
import { clientIdSchema } from "@/server/validation/clients.schema";

/**
 * Scheda Foto (A20–A23): set da completare, salvati e prossimi. Lo staff
 * carica, completa e salva al posto del cliente, con le stesse regole.
 */
async function PhotosContent({
  params,
}: PageProps<"/admin/clienti/[id]/foto">) {
  const session = await requireStaff();
  const parsed = clientIdSchema.safeParse((await params).id);
  if (!parsed.success || !session.studio.id) notFound();
  const [data, header] = await Promise.all([
    getStaffPhotos(session.studio.id, parsed.data),
    getClientHeader(parsed.data),
  ]);
  if (!data) notFound();
  return (
    <PhotosTab data={data} onboarding={header?.journeyStage === "onboarding"} />
  );
}

export default function ClientPhotosPage(
  props: PageProps<"/admin/clienti/[id]/foto">,
) {
  return (
    <Suspense fallback={<PhotosSkeleton />}>
      <PhotosContent {...props} />
    </Suspense>
  );
}
