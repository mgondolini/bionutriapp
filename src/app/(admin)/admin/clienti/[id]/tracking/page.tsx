import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageLoading } from "@/components/shared/page-states";
import { TrackingBoard } from "@/features/admin/clients/tracking/tracking-board";
import { requireStaff } from "@/server/services/session.service";
import { getStaffTracking } from "@/server/services/tracking.service";
import { clientIdSchema } from "@/server/validation/clients.schema";

/** Scheda Tracking (A9): consultazione delle misure e obiettivi personali. */
async function TrackingContent({
  params,
}: Pick<PageProps<"/admin/clienti/[id]/tracking">, "params">) {
  const session = await requireStaff();
  const parsed = clientIdSchema.safeParse((await params).id);
  if (!parsed.success || !session.studio.id) notFound();
  const data = await getStaffTracking(session.studio.id, parsed.data);
  if (!data) notFound();
  return (
    <TrackingBoard
      clientId={data.clientId}
      clientName={data.clientName}
      overview={data.overview}
      goals={data.goals}
      today={data.today}
    />
  );
}

export default function ClientTrackingPage({
  params,
}: PageProps<"/admin/clienti/[id]/tracking">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <TrackingContent params={params} />
    </Suspense>
  );
}
