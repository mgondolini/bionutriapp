import { ClientPageHeader } from "@/features/cliente/client-header";
import { JourneyPage } from "@/features/cliente/journeys/journey-page";
import { JOURNEY_PARAM } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { getClientJourneys } from "@/server/services/journeys.service";
import { requireClient } from "@/server/services/session.service";
import { journeyParamSchema } from "@/server/validation/journeys.schema";

/**
 * Percorso del cliente (C19, C20): raggiunto dalla riga della home (C5) e
 * dalle push del percorso (C21). `?percorso=` mostra un percorso precedente.
 */
export default async function ClientJourneyPage({
  searchParams,
}: PageProps<"/app/percorso">) {
  await requireClient();
  const journeyId = journeyParamSchema.parse(
    (await searchParams)[JOURNEY_PARAM],
  );
  const data = await getClientJourneys(journeyId);
  return (
    <div className="flex flex-col gap-4">
      <ClientPageHeader title={copy.journeys.client.title} />
      <JourneyPage data={data} />
    </div>
  );
}
