import { LineChart } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { copy } from "@/lib/copy/it";
import { requireClient } from "@/server/services/session.service";

const t = copy.client.sections.tracking;

export default async function TrackingPage() {
  await requireClient({ unlocked: true });
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.title} />
      <EmptyState
        icon={LineChart}
        title={t.emptyTitle}
        description={t.emptyDescription}
      />
    </div>
  );
}
