import { redirect } from "next/navigation";

import { ClientPageHeader } from "@/features/cliente/client-header";
import { PhotosPage } from "@/features/cliente/photos/photos-page";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { canClientUploadPhotos } from "@/lib/photos/status";
import { getClientPhotos } from "@/server/services/photos.service";
import { requireClient } from "@/server/services/session.service";

/**
 * Foto di avanzamento del cliente (C22, voce "Foto" del menu e destinazione
 * delle push C27). Anche in Onboarding (foto di partenza); In pausa e
 * Concluso sola lettura.
 */
export default async function ClientPhotosPage() {
  const { client } = await requireClient();
  // in Onboarding le foto di partenza stanno in "Prepara la chiamata" (C30)
  if (client.journeyStage === "onboarding") redirect(ROUTES.client.prep);
  const data = await getClientPhotos(
    client.id,
    canClientUploadPhotos(client.journeyStage),
  );
  return (
    <div className="flex flex-col gap-4">
      <ClientPageHeader title={copy.photos.client.title} />
      <PhotosPage data={data} />
    </div>
  );
}
