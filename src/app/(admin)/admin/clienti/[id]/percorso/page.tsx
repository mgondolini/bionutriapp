import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageLoading } from "@/components/shared/page-states";
import { JourneyTab } from "@/features/admin/journeys/journey-tab";
import { JOURNEY_PARAM } from "@/lib/constants/domain";
import { getStaffJourneys } from "@/server/services/journeys.service";
import { requireStaff } from "@/server/services/session.service";
import { clientIdSchema } from "@/server/validation/clients.schema";
import { journeyParamSchema } from "@/server/validation/journeys.schema";

/** Scheda Percorso (A17–A19): lettura tramite service, modifiche con Server Actions. */
async function JourneyContent({
  params,
  searchParams,
}: PageProps<"/admin/clienti/[id]/percorso">) {
  const session = await requireStaff();
  const parsed = clientIdSchema.safeParse((await params).id);
  if (!parsed.success || !session.studio.id) notFound();
  const data = await getStaffJourneys(session.studio.id, parsed.data);
  if (!data) notFound();
  const selectedId = journeyParamSchema.parse(
    (await searchParams)[JOURNEY_PARAM],
  );
  return (
    <JourneyTab
      data={data}
      selectedId={selectedId}
      clientName={data.client.firstName}
    />
  );
}

export default function ClientJourneyPage(
  props: PageProps<"/admin/clienti/[id]/percorso">,
) {
  return (
    <Suspense fallback={<PageLoading />}>
      <JourneyContent {...props} />
    </Suspense>
  );
}
