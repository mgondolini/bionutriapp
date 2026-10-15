import { Users } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { copy } from "@/lib/copy/it";

const t = copy.admin.clients;

export default function ClientsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t.title} description={t.description} />
      <EmptyState
        icon={Users}
        title={t.emptyTitle}
        description={t.emptyDescription}
      />
    </div>
  );
}
