import { PageHeader } from "@/components/shared/page-header";
import { StudioSettingsForm } from "@/features/admin/studio-settings-form";
import { copy } from "@/lib/copy/it";
import { requireOwner } from "@/server/services/session.service";

const t = copy.admin.settings;

/** Impostazioni studio (A-14, schermata A12): solo il titolare. */
export default async function StudioSettingsPage() {
  const { studio } = await requireOwner();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.title} description={t.description} />
      <StudioSettingsForm
        initial={{
          name: studio.name,
          primaryColor: studio.primaryColor,
          logoUrl: studio.logoUrl,
        }}
      />
    </div>
  );
}
