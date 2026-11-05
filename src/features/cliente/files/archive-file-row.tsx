"use client";

import { ChevronRight, File } from "lucide-react";

import { FileBadgeLabel } from "@/components/shared/file-card";
import { useOpenFile } from "@/components/shared/open-file-button";

/**
 * Riga dell'archivio di Allenamenti e Report (C7): tutta la riga apre il PDF.
 * A destra "Da leggere" finché il file non è aperto, altrimenti la freccia.
 */
export function ArchiveFileRow({
  fileId,
  title,
  meta,
  unread,
}: {
  fileId: string;
  title: string;
  meta: string;
  unread: boolean;
}) {
  const { open, isPending } = useOpenFile(fileId, "view");
  return (
    <button
      type="button"
      onClick={open}
      disabled={isPending}
      className="flex min-h-16 w-full items-center gap-3 bg-card px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset disabled:opacity-70"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint text-secondary-foreground">
        <File aria-hidden="true" className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="line-clamp-2 text-[15px] font-semibold break-words">
          {title}
        </span>
        <span className="text-[12.5px] text-muted-foreground">{meta}</span>
      </span>
      {unread ? (
        <FileBadgeLabel badge="toRead" />
      ) : (
        <ChevronRight
          aria-hidden="true"
          className="size-5 shrink-0 text-secondary-foreground"
        />
      )}
    </button>
  );
}
