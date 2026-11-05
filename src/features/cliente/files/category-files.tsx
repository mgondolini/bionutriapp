import { ChartColumn, Dumbbell, type LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { FileCard } from "@/components/shared/file-card";
import { OpenFileButton } from "@/components/shared/open-file-button";
import { ClientPageHeader } from "@/features/cliente/client-header";
import type { FileCategory } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatFileSize, formatLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { FileItem } from "@/server/services/files.service";

import { ArchiveFileRow } from "./archive-file-row";
import { FileButtons } from "./file-buttons";

const t = copy.client.files;

/**
 * Allenamenti (azzurro) e Report (giallo): il colore della sezione sta solo
 * nell'icona della card in evidenza e nel filo sopra l'archivio; stati,
 * pulsanti e righe restano nei colori del brand. Le Diete usano la card menta.
 */
const SECTION_TONES: Record<
  Exclude<FileCategory, "diet">,
  { icon: LucideIcon; tile: string; line: string }
> = {
  workout: {
    icon: Dumbbell,
    tile: "bg-file-workout",
    line: "border-t-file-workout-line",
  },
  report: {
    icon: ChartColumn,
    tile: "bg-file-report",
    line: "border-t-file-report-line",
  },
};

function archiveMeta(file: FileItem, today: string): string {
  return file.validFrom && file.validFrom > today
    ? t.futureValidity(formatLongDate(file.validFrom))
    : copy.files.meta(
        formatLongDate(file.uploadedAt),
        formatFileSize(file.sizeBytes),
      );
}

/** File in corso di Allenamenti e Report: card bianca con l'icona della sezione. */
function SectionCurrentFile({
  file,
  category,
}: {
  file: FileItem;
  category: Exclude<FileCategory, "diet">;
}) {
  const { icon: Icon, tile } = SECTION_TONES[category];
  return (
    <article className="flex flex-col gap-3 rounded-[18px] border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
        <span className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl text-secondary-foreground",
              tile,
            )}
          >
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <span className="rounded-full bg-mint-foreground px-2.5 py-1 leading-none font-bold text-mint">
            {file.firstReadAt ? copy.files.currentBadge : copy.files.newBadge}
          </span>
        </span>
        {file.validFrom ? (
          <span>{t.currentSince(formatLongDate(file.validFrom))}</span>
        ) : null}
      </div>
      <h3 className="text-[21px] leading-tight font-bold tracking-tight">
        {file.title}
      </h3>
      {file.note ? (
        <blockquote
          aria-label={copy.files.noteLabel}
          className="rounded-xl bg-muted px-3.5 py-3 text-sm leading-normal whitespace-pre-line"
        >
          {copy.files.quotedNote(file.note)}
        </blockquote>
      ) : null}
      <div className="grid grid-cols-2 gap-2.5 *:h-12 *:rounded-xl">
        <OpenFileButton
          fileId={file.id}
          title={file.title}
          mode="view"
          label={copy.files.open}
          variant="default"
          icon="eye"
        />
        <OpenFileButton
          fileId={file.id}
          title={file.title}
          mode="download"
          label={copy.files.download}
          variant="mint-outline"
          className="hover:bg-muted"
        />
      </div>
    </article>
  );
}

type CategoryFilesProps = {
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
          {category === "diet" ? (
            <FileCard
              variant="featured"
              title={current.title}
              badge={current.firstReadAt ? "current" : "new"}
              meta={
                current.validFrom
                  ? t.currentSince(formatLongDate(current.validFrom))
                  : undefined
              }
              note={current.note}
            >
              <FileButtons id={current.id} title={current.title} />
            </FileCard>
          ) : (
            <SectionCurrentFile file={current} category={category} />
          )}
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
          {category === "diet" ? (
            <ul className="flex flex-col divide-y divide-muted overflow-hidden rounded-[14px] border bg-card">
              {archive.map((file) => (
                <li key={file.id}>
                  <FileCard
                    variant="row"
                    title={file.title}
                    badge={file.firstReadAt ? null : "toRead"}
                    meta={archiveMeta(file, today)}
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
          ) : (
            <ul
              className={cn(
                "flex flex-col divide-y divide-muted overflow-hidden rounded-[14px] border border-t-4 bg-card",
                SECTION_TONES[category].line,
              )}
            >
              {archive.map((file) => (
                <li key={file.id}>
                  <ArchiveFileRow
                    fileId={file.id}
                    title={file.title}
                    meta={archiveMeta(file, today)}
                    unread={!file.firstReadAt}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
