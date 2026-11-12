import { ClientPageHeader } from "@/features/cliente/client-header";
import { PhotosPage } from "@/features/cliente/photos/photos-page";
import { copy } from "@/lib/copy/it";
import { getClientPhotos } from "@/server/services/photos.service";
import { requireClient } from "@/server/services/session.service";

/**
 * Foto di avanzamento del cliente (C22, voce "Foto" del menu e destinazione
 * delle push C27). Bloccata in Onboarding; In pausa e Concluso sola lettura.
 */
export default async function ClientPhotosPage() {
  const { client } = await requireClient({ unlocked: true });
  const data = await getClientPhotos(
    client.id,
    client.journeyStage === "in_progress",
  );
  return (
    <div className="flex flex-col gap-4">
      <ClientPageHeader title={copy.photos.client.title} />
      <PhotosPage data={data} />
    </div>
  );
}
