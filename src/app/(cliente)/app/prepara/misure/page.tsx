import { redirect } from "next/navigation";

import { ClientPageHeader } from "@/features/cliente/client-header";
import { PrepMeasuresForm } from "@/features/cliente/onboarding-prep/measures-form";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { todayInRome } from "@/lib/domain/tracking/dates";
import { getOwnPrep } from "@/server/services/onboarding-prep.service";
import { requireClient } from "@/server/services/session.service";

const t = copy.onboardingPrep;

/** Le tue misure di partenza (C29): tutte le misure mensili in una schermata. */
export default async function PrepMeasuresPage() {
  const { client, studio } = await requireClient();
  if (client.journeyStage !== "onboarding" || !studio.id) {
    redirect(ROUTES.client.home);
  }
  const prep = await getOwnPrep(studio.id);
  if (!prep) redirect(ROUTES.client.home);
  const today = todayInRome();
  const sentOn = prep.measures.items.find(
    (item) => item.recordedOn,
  )?.recordedOn;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <ClientPageHeader
          title={t.measuresPage.title}
          backHref={ROUTES.client.prep}
          backLabel={t.title}
        />
        <p className="pl-14 text-sm text-admin-muted">
          {t.measuresPage.heading}
        </p>
      </div>
      <PrepMeasuresForm
        items={prep.measures.items}
        today={today}
        defaultDate={sentOn && sentOn <= today ? sentOn : today}
      />
    </div>
  );
}
