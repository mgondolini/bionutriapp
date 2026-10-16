import { LineChart } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { copy } from "@/lib/copy/it";

const t = copy.admin.clients.detail.placeholders.tracking;

/** Segnaposto: il contenuto arriva in una fase successiva. */
export default function ClientTrackingPage() {
  return (
    <EmptyState icon={LineChart} title={t.title} description={t.description} />
  );
}
