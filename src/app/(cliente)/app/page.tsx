import { House } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { OnboardingHome } from "@/features/cliente/onboarding-home";
import { copy } from "@/lib/copy/it";
import { requireClient } from "@/server/services/session.service";

const t = copy.client.home;

/** Home del cliente: in Onboarding mostra il benvenuto con i prossimi passi (C-09). */
export default async function ClientHomePage() {
  const { client, studio } = await requireClient();
  if (!client.unlocked) return <OnboardingHome studioName={studio.name} />;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.title} />
      <EmptyState icon={House} title={t.title} description={t.description} />
    </div>
  );
}
