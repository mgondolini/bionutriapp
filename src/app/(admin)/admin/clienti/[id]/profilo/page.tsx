import { UserRound } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { copy } from "@/lib/copy/it";

const t = copy.admin.clients.detail.placeholders.profilo;

/** Segnaposto: il contenuto arriva in una fase successiva. */
export default function ClientProfiloPage() {
  return (
    <EmptyState icon={UserRound} title={t.title} description={t.description} />
  );
}
