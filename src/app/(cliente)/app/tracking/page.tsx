import { PageHeader } from "@/components/shared/page-header";
import { TrackingOverview } from "@/features/cliente/tracking/tracking-overview";
import { copy } from "@/lib/copy/it";
import { requireClient } from "@/server/services/session.service";
import {
  clientTrackingActor,
  getClientTracking,
} from "@/server/services/tracking.service";
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants/domain";

const t = copy.client.sections.tracking;

/** Tracking (C8, T-01): le 9 misure con spunta del periodo; bloccato in Onboarding (C-09). */
export default async function TrackingPage() {
  const session = await requireClient({ unlocked: true });
  const actor = clientTrackingActor(session);
  if (!actor) redirect(ROUTES.client.home);
  const { overview, today, canWrite } = await getClientTracking(actor);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.title} description={t.subtitle} />
      <TrackingOverview overview={overview} today={today} canWrite={canWrite} />
    </div>
  );
}
