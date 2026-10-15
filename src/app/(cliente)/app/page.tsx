import { House, Sprout } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { copy } from "@/lib/copy/it";
import { requireClient } from "@/server/services/session.service";

const t = copy.client.home;

/** Home del cliente: in Onboarding mostra il benvenuto con i prossimi passi (C-09). */
export default async function ClientHomePage() {
  const { client } = await requireClient();
  if (!client.unlocked) {
    return (
      <EmptyState
        icon={Sprout}
        title={t.onboardingTitle}
        description={t.onboardingDescription}
      />
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.title} />
      <EmptyState icon={House} title={t.title} description={t.description} />
    </div>
  );
}
