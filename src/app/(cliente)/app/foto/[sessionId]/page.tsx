import { notFound, redirect } from "next/navigation";

import { ClientPageHeader } from "@/features/cliente/client-header";
import { PhotoSetPage } from "@/features/cliente/photos/photo-set-page";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { canClientUploadPhotos } from "@/lib/photos/status";
import { formatLongDate } from "@/lib/format";
import { getClientPhotos } from "@/server/services/photos.service";
import { requireClient } from "@/server/services/session.service";
import { photoSessionSchema } from "@/server/validation/photos.schema";

/** Un set del cliente: caricamento in bozza (C23–C25) o foto salvate (C26). */
export default async function ClientPhotoSetPage({
  params,
}: PageProps<"/app/foto/[sessionId]">) {
  const { client } = await requireClient();
  // in Onboarding le foto di partenza stanno in "Prepara la chiamata" (C30)
  if (client.journeyStage === "onboarding") redirect(ROUTES.client.prep);
  const parsed = photoSessionSchema.safeParse({
    sessionId: (await params).sessionId,
  });
  if (!parsed.success) notFound();
  const data = await getClientPhotos(
    client.id,
    canClientUploadPhotos(client.journeyStage),
  );
  const set = data.sets.find((s) => s.sessionId === parsed.data.sessionId);
  if (!set) notFound();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <ClientPageHeader
          title={
            set.state === "saved"
              ? set.label
              : copy.photos.client.setTitle(set.label)
          }
          backHref={ROUTES.client.photos}
          backLabel={copy.photos.client.title}
        />
        <p className="pl-14 text-sm text-admin-muted">
          {formatLongDate(set.date)}
        </p>
      </div>
      <PhotoSetPage set={set} />
    </div>
  );
}
