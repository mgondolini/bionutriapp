import { ClientPageHeader } from "@/features/cliente/client-header";
import { JourneyPage } from "@/features/cliente/journeys/journey-page";
import { JOURNEY_PARAM } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { getClientJourneys } from "@/server/services/journeys.service";
import { getClientPhotoMarks } from "@/server/services/photos.service";
import { requireClient } from "@/server/services/session.service";
import { journeyParamSchema } from "@/server/validation/journeys.schema";

/**
 * Percorso del cliente (C19, C20): raggiunto dalla riga della home (C5) e
 * dalle push del percorso (C21). `?percorso=` mostra un percorso precedente.
 */
export default async function ClientJourneyPage({
  searchParams,
}: PageProps<"/app/percorso">) {
  const session = await requireClient();
  const journeyId = journeyParamSchema.parse(
    (await searchParams)[JOURNEY_PARAM],
  );
  const [data, photoMarks] = await Promise.all([
    getClientJourneys(journeyId),
    getClientPhotoMarks(session.client.id),
  ]);
  // segno "Foto" sui check con le foto (C19)
  const marked = data.shown
    ? {
        ...data,
        shown: {
          ...data.shown,
          sessions: data.shown.sessions.map((s) =>
            photoMarks[s.id] ? { ...s, photo: photoMarks[s.id] } : s,
          ),
        },
      }
    : data;
  return (
    <div className="flex flex-col gap-4">
      <ClientPageHeader title={copy.journeys.client.title} />
      <JourneyPage data={marked} studioName={session.studio.name} />
    </div>
  );
}
