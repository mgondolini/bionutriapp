import { redirect } from "next/navigation";

import { ClientPageHeader } from "@/features/cliente/client-header";
import { PrepPage } from "@/features/cliente/onboarding-prep/prep-page";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { getOwnPrep } from "@/server/services/onboarding-prep.service";
import { getClientPhotos } from "@/server/services/photos.service";
import { requireClient } from "@/server/services/session.service";

/**
 * Prepara la chiamata (C28), riepilogo quando è tutto inviato (C31). Solo in
 * Onboarding: dopo, misure e foto stanno nel Tracking e nella pagina Foto.
 */
export default async function PrepPageRoute() {
  const { client, studio } = await requireClient();
  if (client.journeyStage !== "onboarding" || !studio.id) {
    redirect(ROUTES.client.home);
  }
  const [prep, photos] = await Promise.all([
    getOwnPrep(studio.id),
    getClientPhotos(client.id, true, true),
  ]);
  if (!prep) redirect(ROUTES.client.home);
  const set = photos.sets.find((item) => item.checkNumber === null) ?? null;
  return (
    <div className="flex flex-col gap-4">
      <ClientPageHeader title={copy.onboardingPrep.title} />
      <PrepPage prep={prep} set={set} studioName={studio.name} />
    </div>
  );
}
