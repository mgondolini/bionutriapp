import { ChevronRight, ClipboardList, Lock, NotebookPen } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { clientNotesPath } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NoteListEntry } from "@/server/services/client-notes.service";

import { updatedLabel } from "./labels";
import { NewNoteButton } from "./new-note-button";

const t = copy.clientNotes;

/**
 * Elenco dei documenti del cliente: l'anamnesi in cima, poi le note di
 * visita dalla più recente. Su desktop è la colonna di 300 px accanto
 * all'editor; sul telefono è una schermata a sé, con l'anamnesi in una card
 * menta e "Nuova nota" in basso, a portata di pollice.
 */
export function NotesList({
  clientId,
  notes,
  selectedId,
}: {
  clientId: string;
  notes: NoteListEntry[];
  /** Nota aperta nell'editor (evidenziata su desktop). */
  selectedId: string | null;
}) {
  const anamnesis = notes.find((note) => note.kind === "anamnesis");
  const visits = notes.filter((note) => note.kind === "visit");

  return (
    <section
      aria-label={t.listLabel}
      className="flex flex-col gap-4 pb-24 lg:gap-1.5 lg:rounded-[20px] lg:border lg:border-admin-line lg:bg-card lg:px-2 lg:pt-4 lg:pb-3"
    >
      <div className="hidden items-center justify-between gap-2 px-3 pb-2 lg:flex">
        <h2 className="text-base font-bold">{t.listTitle}</h2>
        <NewNoteButton clientId={clientId} className="h-10 text-[13px]" />
      </div>

      <p className="flex items-center gap-2 text-[13px] text-admin-muted lg:hidden">
        <Lock aria-hidden="true" strokeWidth={1.8} className="size-4" />
        {t.privateList}
      </p>

      {anamnesis ? (
        <Link
          href={clientNotesPath(clientId, anamnesis.id)}
          aria-current={anamnesis.id === selectedId ? "page" : undefined}
          className={cn(
            "flex items-center gap-3.5 rounded-[20px] bg-mint px-4 py-3.5 text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 max-lg:min-h-[76px]",
            "lg:items-start lg:gap-3 lg:rounded-[14px] lg:bg-transparent lg:p-3 lg:hover:bg-admin-row-hover lg:aria-[current=page]:bg-wash",
          )}
        >
          <ClipboardList
            aria-hidden="true"
            strokeWidth={1.8}
            className="size-6 shrink-0 lg:mt-px lg:size-5"
          />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-base font-bold lg:text-[14.5px]">
              {anamnesis.title}
            </span>
            <span className="mt-0.5 text-[13px] text-secondary-foreground lg:text-[12.5px] lg:text-admin-muted">
              {updatedLabel(anamnesis.updatedAt)}
            </span>
          </span>
          <ChevronRight
            aria-hidden="true"
            strokeWidth={1.8}
            className="size-5 shrink-0 lg:hidden"
          />
        </Link>
      ) : null}

      <h2 className="mt-2 text-xs font-semibold tracking-[0.04em] text-admin-muted uppercase lg:mt-0 lg:px-3 lg:pt-3.5 lg:pb-1">
        {t.visitsHeading}
      </h2>

      {visits.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title={t.emptyVisits}
          className="rounded-[20px] border-admin-line px-4 py-8 lg:mx-1 lg:py-6"
        />
      ) : (
        <ul className="overflow-hidden rounded-[20px] border border-admin-line bg-card lg:flex lg:flex-col lg:gap-0.5 lg:rounded-none lg:border-0">
          {visits.map((note) => (
            <li
              key={note.id}
              className="border-b border-admin-hover last:border-b-0 lg:border-0"
            >
              <Link
                href={clientNotesPath(clientId, note.id)}
                aria-current={note.id === selectedId ? "page" : undefined}
                className="flex min-h-[72px] items-center gap-3 px-4 py-3 text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset lg:min-h-0 lg:rounded-[14px] lg:p-3 lg:hover:bg-admin-row-hover lg:aria-[current=page]:bg-wash"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[15px] font-semibold lg:text-sm">
                      {note.title}
                    </span>
                    <span className="text-[12.5px] whitespace-nowrap text-admin-muted">
                      {note.visitDate ? formatShortDate(note.visitDate) : null}
                    </span>
                  </span>
                  {note.excerpt ? (
                    <span className="mt-0.5 truncate text-[13.5px] text-admin-muted lg:text-[13px]">
                      {note.excerpt}
                    </span>
                  ) : null}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  strokeWidth={1.8}
                  className="size-[18px] shrink-0 text-admin-muted lg:hidden"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-admin-line bg-background px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] lg:hidden">
        <NewNoteButton clientId={clientId} className="h-13 w-full text-[15px]" />
      </div>
    </section>
  );
}
