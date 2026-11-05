import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { FileCard } from "@/components/shared/file-card";
import { OpenFileButton } from "@/components/shared/open-file-button";
import { ClientPageHeader } from "@/features/cliente/client-header";
import type { FileCategory } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatFileSize, formatLongDate } from "@/lib/format";
import type { FileItem } from "@/server/services/files.service";

import { FileButtons } from "./file-buttons";

const t = copy.client.files;

type CategoryFilesProps = {
  /** Colori della pagina: card in evidenza, icone e badge dell'archivio. */
  category: FileCategory;
  title: string;
  subtitle: string;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  current: FileItem | null;
  archive: FileItem[];
  /** Giorno di oggi "YYYY-MM-DD" (Europe/Rome), per i file con validità futura. */
  today: string;
};

/** Pagine Diete, Allenamenti e Report (C-04, schermata C7): file in corso in evidenza e archivio. */
export function CategoryFiles({
  category,
  title,
  subtitle,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  current,
  archive,
  today,
}: CategoryFilesProps) {
  return (
    <div className="flex flex-col gap-4">
      <ClientPageHeader title={title} />
      <p className="text-sm text-muted-foreground">{subtitle}</p>

      {!current && archive.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : null}

      {current ? (
        <section aria-labelledby="current-file" className="flex flex-col gap-3">
          <h2 id="current-file" className="sr-only">
            {t.currentTitle}
          </h2>
          <FileCard
            variant="featured"
            category={category}
            title={current.title}
            badge={current.firstReadAt ? "current" : "new"}
            meta={
              current.validFrom
                ? t.currentSince(formatLongDate(current.validFrom))
                : undefined
            }
            note={current.note}
          >
            <FileButtons
              id={current.id}
              title={current.title}
              category={category}
            />
          </FileCard>
        </section>
      ) : null}

      {archive.length > 0 ? (
        <section aria-labelledby="archive" className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="archive" className="text-[17px] font-bold">
              {t.archiveTitle}
            </h2>
            <span className="text-[13px] text-muted-foreground">
              {t.archiveCount(archive.length)}
            </span>
          </div>
          <ul className="flex flex-col divide-y divide-muted overflow-hidden rounded-[14px] border bg-card">
            {archive.map((file) => (
              <li key={file.id}>
                <FileCard
                  variant="row"
                  category={category}
                  title={file.title}
                  badge={file.firstReadAt ? null : "toRead"}
                  meta={
                    file.validFrom && file.validFrom > today
                      ? t.futureValidity(formatLongDate(file.validFrom))
                      : copy.files.meta(
                          formatLongDate(file.uploadedAt),
                          formatFileSize(file.sizeBytes),
                        )
                  }
                >
                  <OpenFileButton
                    fileId={file.id}
                    title={file.title}
                    mode="view"
                    label={copy.files.openShort}
                    variant="outline"
                    size="sm"
                  />
                </FileCard>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
