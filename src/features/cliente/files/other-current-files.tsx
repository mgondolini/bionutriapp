import { cva } from "class-variance-authority";
import { FILE_CATEGORY_ICONS } from "@/components/shared/file-card";
import { OpenFileButton } from "@/components/shared/open-file-button";
import type { FileCategory } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatLongDate } from "@/lib/format";
import type { FileItem } from "@/server/services/files.service";

const t = copy.client.home;

/** Colore della card per categoria, come le voci del menu (C5, C6). */
const cardVariants = cva("flex min-h-44 flex-col gap-1 rounded-2xl p-3.5", {
  variants: {
    category: {
      diet: "bg-primary-tint text-foreground",
      workout: "bg-file-workout text-foreground",
      report: "bg-file-report text-foreground",
    } satisfies Record<FileCategory, string>,
  },
});

/**
 * "Altri file in corso" della home (C-02, C5): il file in corso delle altre
 * categorie, con "Nuovo" finché il cliente non lo apre. Non compare se non ce
 * ne sono.
 */
export function OtherCurrentFiles({ files }: { files: FileItem[] }) {
  if (files.length === 0) return null;
  return (
    <section aria-labelledby="other-files" className="flex flex-col gap-2.5">
      <h2 id="other-files" className="text-[17px] font-bold">
        {t.otherFiles}
      </h2>
      <ul className="grid grid-cols-2 gap-3">
        {files.map((file) => {
          const Icon = FILE_CATEGORY_ICONS[file.category];
          return (
            <li
              key={file.id}
              className={cardVariants({ category: file.category })}
            >
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <span className="flex size-10 items-center justify-center rounded-[10px] bg-card">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                {file.firstReadAt ? null : (
                  <span className="rounded-full bg-card px-2.5 py-1 text-xs leading-none font-semibold">
                    {copy.files.newBadge}
                  </span>
                )}
              </div>
              <span className="text-[12.5px] font-bold">
                {copy.domain.fileCategory[file.category]}
              </span>
              <h3 className="text-[15px] leading-tight font-bold break-words text-foreground">
                {file.title}
              </h3>
              <span className="text-[12.5px]">
                {formatLongDate(file.validFrom ?? file.uploadedAt)}
              </span>
              <OpenFileButton
                fileId={file.id}
                title={file.title}
                mode="view"
                label={copy.files.openShort}
                variant="ghost"
                icon="chevron"
                className="mt-auto -ml-2 self-start px-2 text-sm font-bold text-inherit hover:bg-card/60 hover:text-inherit"
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
