import { Camera } from "lucide-react";
import { redirect } from "next/navigation";

import { ClientPageHeader } from "@/features/cliente/client-header";
import { PhotoSetPage } from "@/features/cliente/photos/photo-set-page";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatDayMonthLong } from "@/lib/format";
import { getClientPhotos } from "@/server/services/photos.service";
import { requireClient } from "@/server/services/session.service";

const t = copy.onboardingPrep.photosPage;

/**
 * Foto di partenza (C30): lo stesso flusso delle foto di avanzamento (bozza,
 * scelta della fonte, conferma, blocco) sul set di partenza, con la data
 * della chiamata al posto del check.
 */
export default async function PrepPhotosPage() {
  const { client } = await requireClient();
  if (client.journeyStage !== "onboarding") redirect(ROUTES.client.home);
  const data = await getClientPhotos(client.id, true, true);
  const set = data.sets.find((item) => item.checkNumber === null);
  if (!set) redirect(ROUTES.client.prep);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <ClientPageHeader
          title={t.title}
          backHref={ROUTES.client.prep}
          backLabel={copy.onboardingPrep.title}
        />
        <p className="pl-14 text-sm text-admin-muted">
          {t.subtitle(formatDayMonthLong(set.date))}
        </p>
      </div>
      {set.state !== "saved" ? (
        <p className="flex items-start gap-3 rounded-[20px] bg-mint p-4 text-sm leading-5">
          <Camera
            aria-hidden="true"
            strokeWidth={1.8}
            className="mt-0.5 size-4 shrink-0"
          />
          <span>
            <b>{t.introTitle}</b> {t.intro}
          </span>
        </p>
      ) : null}
      <PhotoSetPage set={set} />
    </div>
  );
}
