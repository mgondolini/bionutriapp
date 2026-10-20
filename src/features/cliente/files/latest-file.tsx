import { FileText } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { FileCard } from "@/components/shared/file-card";
import { copy } from "@/lib/copy/it";
import { formatLongDate } from "@/lib/format";
import type { FileItem } from "@/server/services/files.service";

import { FileButtons } from "./file-buttons";

const t = copy.client.home;

/** Ultimo file pubblicato nella home (C-02, schermata C5): "Nuovo" finché il cliente non lo apre. */
export function LatestFile({ file }: { file: FileItem | null }) {
  return (
    <section aria-labelledby="latest-file" className="flex flex-col gap-3">
      <h2 id="latest-file" className="text-sm font-semibold">
        {t.latestFile}
      </h2>
      {file ? (
        <FileCard
          variant="featured"
          title={file.title}
          badge={file.firstReadAt ? null : "new"}
          eyebrow={`${copy.domain.fileCategory[file.category]} · ${formatLongDate(file.uploadedAt)}`}
          note={file.note}
        >
          <FileButtons id={file.id} title={file.title} />
        </FileCard>
      ) : (
        <EmptyState
          icon={FileText}
          title={t.noFilesTitle}
          description={t.noFilesDescription}
        />
      )}
    </section>
  );
}
