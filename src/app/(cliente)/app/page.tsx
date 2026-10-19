import { PageHeader } from "@/components/shared/page-header";
import { OnboardingHome } from "@/features/cliente/onboarding-home";
import {
  LatestFile,
  ToRecordPlaceholder,
} from "@/features/cliente/files/latest-file";
import { copy } from "@/lib/copy/it";
import { getClientLatestFile } from "@/server/services/files.service";
import { requireClient } from "@/server/services/session.service";

const t = copy.client.home;

/**
 * Home del cliente: in Onboarding il benvenuto con i prossimi passi (C-09),
 * poi l'ultimo file pubblicato e le misure da registrare (C-02).
 */
export default async function ClientHomePage() {
  const { client, studio } = await requireClient();
  if (!client.unlocked) return <OnboardingHome studioName={studio.name} />;
  const latest = await getClientLatestFile(client.id);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.title} />
      <LatestFile file={latest} />
      <ToRecordPlaceholder />
    </div>
  );
}
