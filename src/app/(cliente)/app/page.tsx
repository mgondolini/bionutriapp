import { PageHeader } from "@/components/shared/page-header";
import { LatestFile } from "@/features/cliente/files/latest-file";
import { OnboardingHome } from "@/features/cliente/onboarding-home";
import { ToRecord } from "@/features/cliente/tracking/to-record";
import { copy } from "@/lib/copy/it";
import { getClientLatestFile } from "@/server/services/files.service";
import { requireClient } from "@/server/services/session.service";
import {
  clientTrackingActor,
  getHomeToRecord,
} from "@/server/services/tracking.service";

const t = copy.client.home;

/**
 * Home del cliente: in Onboarding il benvenuto con i prossimi passi (C-09),
 * poi l'ultimo file pubblicato e le misure da registrare (C-02). In sola
 * lettura (In pausa, Concluso) il riepilogo delle misure non compare.
 */
export default async function ClientHomePage() {
  const session = await requireClient();
  const { client, studio } = session;
  if (!client.unlocked) return <OnboardingHome studioName={studio.name} />;
  const actor = clientTrackingActor(session);
  const [latest, toRecord] = await Promise.all([
    getClientLatestFile(client.id),
    actor?.canWrite ? getHomeToRecord(actor) : null,
  ]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.title} />
      <LatestFile file={latest} />
      {toRecord ? <ToRecord items={toRecord} /> : null}
    </div>
  );
}
