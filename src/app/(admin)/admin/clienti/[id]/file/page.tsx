import { FileText } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { copy } from "@/lib/copy/it";

const t = copy.admin.clients.detail.placeholders.file;

/** Segnaposto: il contenuto arriva in una fase successiva. */
export default function ClientFilePage() {
  return (
    <EmptyState icon={FileText} title={t.title} description={t.description} />
  );
}
