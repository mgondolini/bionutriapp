import { FileText } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { FileBadgeLabel, FileCard } from "@/components/shared/file-card";
import { OpenFileButton } from "@/components/shared/open-file-button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FILE_CATEGORIES,
  clientFilesUrl,
  type FileCategory,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { countByCategory, filterByCategory } from "@/lib/files/file-checks";
import {
  formatDateTime,
  formatLongDate,
  formatNumericDate,
  formatShortDate,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StaffFileItem } from "@/server/services/files.service";

import { DeleteFileDialog } from "./delete-file-dialog";

const t = copy.admin.clients.files.list;
const f = copy.files;

/** "Letto il 07/10/2026" (ora completa al passaggio del mouse) o "Non ancora letto". */
function ReadStatus({ firstReadAt }: { firstReadAt: string | null }) {
  if (!firstReadAt) {
    return <span className="text-muted-foreground">{f.notRead}</span>;
  }
  return (
    <time
      dateTime={firstReadAt}
      title={formatDateTime(firstReadAt)}
      className="font-medium text-success-foreground"
    >
      {f.readOn(formatNumericDate(firstReadAt))}
    </time>
  );
}

function FileActions({
  file,
  clientName,
}: {
  file: StaffFileItem;
  clientName: string;
}) {
  const read = file.firstReadAt
    ? f.readOn(formatNumericDate(file.firstReadAt))
    : f.notRead.toLowerCase();
  return (
    <div className="flex items-center justify-end gap-1">
      <OpenFileButton
        fileId={file.id}
        title={file.title}
        mode="view"
        label={f.openShort}
        variant="outline"
      />
      <DeleteFileDialog
        fileId={file.id}
        title={file.title}
        clientName={clientName}
        meta={copy.admin.clients.files.delete.meta(
          copy.domain.fileCategory[file.category],
          formatLongDate(file.uploadedAt),
          read,
        )}
      />
    </div>
  );
}

type ClientFilesListProps = {
  clientId: string;
  clientName: string;
  files: StaffFileItem[];
  category: FileCategory | null;
};

/** File pubblicati (A-10, schermata A7): filtro per categoria, stato di lettura, apertura ed eliminazione. */
export function ClientFilesList({
  clientId,
  clientName,
  files,
  category,
}: ClientFilesListProps) {
  const counts = countByCategory(files);
  const visible = filterByCategory(files, category);
  const filters: { key: FileCategory | null; label: string; count: number }[] =
    [
      { key: null, label: t.all, count: counts.all },
      ...FILE_CATEGORIES.map((key) => ({
        key,
        label: copy.domain.fileCategory[key],
        count: counts[key],
      })),
    ];

  return (
    <section
      aria-labelledby="client-files-title"
      className="flex flex-col gap-4 rounded-xl border bg-card p-5 text-card-foreground"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="client-files-title" className="text-base font-semibold">
          {t.title}
        </h2>
        <nav aria-label={t.filterLabel}>
          <ul className="flex flex-wrap gap-1 rounded-lg bg-muted p-1">
            {filters.map(({ key, label, count }) => {
              const active = key === category;
              return (
                <li key={key ?? "all"}>
                  <Link
                    href={clientFilesUrl(clientId, key)}
                    scroll={false}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                      active
                        ? "bg-background shadow-xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {label}
                    <span className="text-xs text-muted-foreground">
                      {count}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={files.length === 0 ? t.emptyTitle : t.emptyCategoryTitle}
          description={files.length === 0 ? t.emptyDescription : undefined}
        />
      ) : (
        <>
          <Table className="hidden md:table">
            <TableCaption className="sr-only">{t.caption}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>{t.file}</TableHead>
                <TableHead>{t.category}</TableHead>
                <TableHead>{t.uploadedAt}</TableHead>
                <TableHead>{t.validFrom}</TableHead>
                <TableHead>{t.readStatus}</TableHead>
                <TableHead className="text-right">{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="max-w-72 whitespace-normal">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{file.title}</span>
                      {file.current ? <FileBadgeLabel badge="current" /> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {copy.domain.fileCategory[file.category]}
                  </TableCell>
                  <TableCell>{formatLongDate(file.uploadedAt)}</TableCell>
                  <TableCell>
                    {file.validFrom ? formatShortDate(file.validFrom) : null}
                  </TableCell>
                  <TableCell>
                    <ReadStatus firstReadAt={file.firstReadAt} />
                  </TableCell>
                  <TableCell>
                    <FileActions file={file} clientName={clientName} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <ul className="flex flex-col gap-2 md:hidden">
            {visible.map((file) => (
              <li key={file.id}>
                <FileCard
                  variant="row"
                  title={file.title}
                  badge={file.current ? "current" : null}
                  meta={
                    <span className="flex flex-col">
                      <span>
                        {f.meta(
                          copy.domain.fileCategory[file.category],
                          formatLongDate(file.uploadedAt),
                        )}
                      </span>
                      <ReadStatus firstReadAt={file.firstReadAt} />
                    </span>
                  }
                >
                  <FileActions file={file} clientName={clientName} />
                </FileCard>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
