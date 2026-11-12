"use client";

import Highlight from "@tiptap/extension-highlight";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import {
  ArrowLeft,
  Ellipsis,
  FileText,
  Lock,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { NOTE_SAVE_CONFLICT, clientNotesPath } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import {
  appendAnamnesisTemplate,
  type NoteDoc,
} from "@/lib/domain/client-notes/content";
import { todayInRome } from "@/lib/domain/tracking/dates";
import { formatShortDate } from "@/lib/format";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";
import { saveNoteAction } from "@/server/actions/client-notes.actions";
import type { NoteDetail } from "@/server/services/client-notes.service";
import {
  noteTitleSchema,
  visitDateSchema,
} from "@/server/validation/client-notes.schema";

import { cleanPastedHtml } from "./clean-pasted-html";
import { DeleteNoteDialog } from "./delete-note-dialog";
import { BubbleToolbar, EditorToolbar } from "./editor-toolbar";
import { SaveStatus, type SaveState } from "./save-status";
import { useLeaveGuard } from "./use-leave-guard";
import { useVisualViewport } from "./use-visual-viewport";

const t = copy.clientNotes;

/** Sotto `lg` (1024 px): elenco ed editor in due schermate. */
const NARROW_QUERY = "(max-width: 1023.98px)";

/** Testo del documento: 16 px, righe di lettura fino a circa 720 px. */
const CONTENT_CLASS = cn(
  "min-h-[50vh] max-w-[720px] text-base leading-[1.7] text-foreground outline-none lg:min-h-[420px]",
  "[&_h2]:mt-7 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:leading-snug [&_h2]:font-bold [&_h2]:tracking-[-0.01em] [&_h2:first-child]:mt-0",
  "[&_h3]:mt-5 [&_h3]:mb-1.5 [&_h3]:text-[17px] [&_h3]:leading-snug [&_h3]:font-bold [&_h3:first-child]:mt-0",
  "[&_p+p]:mt-3 [&_strong]:font-bold",
  "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:pl-1",
  "[&_mark]:rounded-[3px] [&_mark]:bg-warm [&_mark]:px-[3px] [&_mark]:text-foreground",
);

type FieldErrors = { title?: string; visitDate?: string };

/**
 * Editor di una nota clinica (anamnesi o nota di visita): titolo, data
 * della visita, testo con Tiptap. Si salva solo con "Salva" (o Ctrl/Cmd+S);
 * con modifiche non salvate chiede conferma prima di lasciare la pagina. Se
 * la nota è cambiata su un altro dispositivo non sovrascrive: avviso con
 * "Ricarica" e "Sovrascrivi comunque".
 *
 * `fullscreen`: sul telefono l'editor occupa lo schermo (seconda schermata
 * dopo l'elenco), con "Indietro" e la barra degli strumenti sopra la tastiera.
 */
export function NoteEditor({
  note,
  clientId,
  fullscreen,
}: {
  note: NoteDetail;
  clientId: string;
  fullscreen: boolean;
}) {
  const ids = useId();
  const router = useRouter();
  const narrow = useMediaQuery(NARROW_QUERY);
  const viewport = useVisualViewport(fullscreen && narrow);

  const [title, setTitle] = useState(note.title);
  const [visitDate, setVisitDate] = useState(note.visitDate ?? "");
  const [version, setVersion] = useState(note.updatedAt);
  const [revision, setRevision] = useState(0);
  const [savedRevision, setSavedRevision] = useState(0);
  const [phase, setPhase] = useState<"idle" | "saving" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [conflict, setConflict] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const dirty = revision !== savedRevision;
  const release = useLeaveGuard(dirty, t.leaveWarning);
  const isVisit = note.kind === "visit";

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
        strike: false,
        underline: false,
      }),
      Highlight.configure({ multicolor: false }),
    ],
    content: note.content as JSONContent,
    editorProps: {
      attributes: {
        class: CONTENT_CLASS,
        "aria-label": t.contentLabel(note.title),
      },
      transformPastedHTML: cleanPastedHtml,
    },
    onUpdate: () => setRevision((value) => value + 1),
  });

  const touch = () => setRevision((value) => value + 1);

  const state: SaveState =
    phase === "saving"
      ? "saving"
      : phase === "failed"
        ? "failed"
        : dirty
          ? "dirty"
          : "clean";

  const save = async (force = false) => {
    if (!editor || phase === "saving") return;
    const errors: FieldErrors = {};
    const parsedTitle = noteTitleSchema.safeParse(title);
    if (!parsedTitle.success) errors.title = parsedTitle.error.issues[0]?.message;
    if (isVisit) {
      const parsedDate = visitDateSchema.safeParse(visitDate);
      if (!parsedDate.success) {
        errors.visitDate = parsedDate.error.issues[0]?.message;
      }
    }
    setFieldErrors(errors);
    setError(null);
    if (errors.title || errors.visitDate) {
      setPhase("failed");
      return;
    }

    const savingRevision = revision;
    setPhase("saving");
    const result = await saveNoteAction({
      noteId: note.id,
      title,
      visitDate: isVisit ? visitDate : null,
      content: JSON.stringify(editor.getJSON()),
      expectedUpdatedAt: version,
      force,
    });
    if (redirectIfSignedOut(result)) return;
    if (!result.ok) {
      if (result.error === NOTE_SAVE_CONFLICT) {
        setConflict(true);
        setPhase("idle");
        return;
      }
      setPhase("failed");
      setError(result.error);
      setFieldErrors({
        title: result.fieldErrors?.title?.[0],
        visitDate: result.fieldErrors?.visitDate?.[0],
      });
      return;
    }
    setVersion(result.data.updatedAt);
    setTitle(result.data.title);
    setSavedRevision(savingRevision);
    setConflict(false);
    setPhase("idle");
  };

  const reload = () => {
    release();
    window.location.reload();
  };

  const insertTemplate = () => {
    if (!editor) return;
    editor.commands.setContent(
      appendAnamnesisTemplate(editor.getJSON() as NoteDoc) as JSONContent,
      { emitUpdate: true },
    );
    editor.commands.focus("end");
    toast.success(t.templateInserted);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      void save();
    }
  };

  const saveButton = (className?: string) => (
    <Button
      type="button"
      variant="action"
      onClick={() => void save()}
      disabled={!editor || phase === "saving" || (!dirty && phase !== "failed")}
      className={cn("rounded-[14px]", className)}
    >
      {t.save}
    </Button>
  );

  return (
    <section
      aria-label={t.editorLabel}
      data-note-fullscreen={fullscreen ? "" : undefined}
      onKeyDown={onKeyDown}
      style={
        viewport
          ? {
              height: viewport.height,
              transform: `translateY(${viewport.offsetTop}px)`,
            }
          : undefined
      }
      className={cn(
        "flex flex-col bg-card text-foreground lg:rounded-[20px] lg:border lg:border-admin-line",
        fullscreen && "max-lg:fixed max-lg:inset-x-0 max-lg:top-0 max-lg:z-40 max-lg:h-dvh",
      )}
    >
      {/* Barra superiore del telefono */}
      <header className="flex items-center gap-1.5 border-b border-admin-line py-2 pr-2 pl-1.5 lg:hidden">
        <Link
          href={clientNotesPath(clientId)}
          aria-label={t.back}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <ArrowLeft aria-hidden="true" strokeWidth={1.8} className="size-[22px]" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg leading-tight font-bold tracking-[-0.01em]">
            {title || note.title}
          </h1>
          <SaveStatus state={state} savedAt={version} className="text-[12.5px]" />
        </div>
        {saveButton("h-11 px-3.5")}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t.moreActions}
            className="flex size-11 shrink-0 items-center justify-center rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-expanded:bg-admin-hover"
          >
            <Ellipsis aria-hidden="true" strokeWidth={1.8} className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            {isVisit ? (
              <DropdownMenuItem
                className="min-h-11"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 aria-hidden="true" strokeWidth={1.8} />
                {t.delete}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem className="min-h-11" onClick={insertTemplate}>
                <FileText aria-hidden="true" strokeWidth={1.8} />
                {t.insertTemplate}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="flex min-h-0 flex-1 flex-col max-lg:overflow-y-auto">
        {/* Testata del documento */}
        <div className="flex flex-col gap-4 px-5 pt-5 pb-4 lg:flex-row lg:items-start lg:justify-between lg:px-7 lg:pt-[22px] lg:pb-[18px]">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor={`${ids}-title`} className="sr-only">
              {t.titleLabel}
            </label>
            <input
              id={`${ids}-title`}
              type="text"
              value={title}
              maxLength={200}
              onChange={(event) => {
                setTitle(event.target.value);
                touch();
              }}
              aria-invalid={fieldErrors.title ? true : undefined}
              aria-describedby={fieldErrors.title ? `${ids}-title-error` : undefined}
              className="-mx-1.5 w-full max-w-[420px] rounded-lg bg-transparent px-1.5 text-xl font-bold tracking-[-0.01em] text-foreground outline-none hover:bg-admin-row-hover focus-visible:ring-3 focus-visible:ring-ring/50 lg:text-2xl"
            />
            {fieldErrors.title ? (
              <p
                id={`${ids}-title-error`}
                className="text-[13px] font-semibold text-warning-foreground"
              >
                {fieldErrors.title}
              </p>
            ) : null}
            <SaveStatus state={state} savedAt={version} className="max-lg:hidden" />
            <p className="flex items-center gap-1.5 text-[13px] font-semibold lg:hidden">
              <Lock aria-hidden="true" strokeWidth={1.8} className="size-4" />
              {t.privateBadge}
            </p>
            {isVisit ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <label
                  htmlFor={`${ids}-date`}
                  className="text-[13px] font-semibold"
                >
                  {t.dateLabel}
                </label>
                <Input
                  id={`${ids}-date`}
                  type="date"
                  value={visitDate}
                  max={todayInRome()}
                  onChange={(event) => {
                    setVisitDate(event.target.value);
                    touch();
                  }}
                  aria-invalid={fieldErrors.visitDate ? true : undefined}
                  aria-describedby={
                    fieldErrors.visitDate ? `${ids}-date-error` : undefined
                  }
                  className="w-44"
                />
                {fieldErrors.visitDate ? (
                  <p
                    id={`${ids}-date-error`}
                    className="w-full text-[13px] font-semibold text-warning-foreground"
                  >
                    {fieldErrors.visitDate}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2.5 max-lg:hidden lg:flex-none lg:justify-end">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-full bg-admin-hover px-3 text-[12.5px] font-semibold">
              <Lock aria-hidden="true" strokeWidth={1.8} className="size-3.5" />
              {t.privateBadge}
            </span>
            {isVisit ? (
              <Button
                type="button"
                variant="neutral"
                onClick={() => setDeleteOpen(true)}
                className="h-10 rounded-[14px] text-[13px]"
              >
                <Trash2 aria-hidden="true" strokeWidth={1.8} />
                {t.delete}
              </Button>
            ) : (
              <Button
                type="button"
                variant="neutral"
                onClick={insertTemplate}
                disabled={!editor}
                className="h-10 rounded-[14px] text-[13px]"
              >
                <FileText aria-hidden="true" strokeWidth={1.8} />
                {t.insertTemplate}
              </Button>
            )}
            {saveButton("h-10 text-[13px]")}
          </div>
        </div>

        {conflict ? (
          <div
            role="alert"
            className="mx-5 mb-4 flex flex-col gap-3 rounded-[14px] bg-warm px-4 py-3 text-foreground lg:mx-7"
          >
            <div className="flex flex-col gap-0.5">
              <p className="font-bold">{t.conflict.title}</p>
              <p className="text-sm">{t.conflict.description}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="neutral"
                className="rounded-[14px]"
                onClick={reload}
              >
                {t.conflict.reload}
              </Button>
              <Button
                type="button"
                variant="neutral"
                className="rounded-[14px]"
                onClick={() => void save(true)}
                disabled={phase === "saving"}
              >
                {t.conflict.overwrite}
              </Button>
            </div>
          </div>
        ) : null}
        {error ? (
          <FormMessage className="mx-5 mb-4 lg:mx-7">{error}</FormMessage>
        ) : null}

        {editor ? (
          <EditorToolbar
            editor={editor}
            className="sticky top-0 z-10 max-lg:hidden"
          />
        ) : null}

        <div className="flex-1 px-5 pt-6 pb-6 lg:px-10 lg:pt-8">
          <EditorContent editor={editor} />
          {editor && !narrow ? (
            <BubbleMenu editor={editor} options={{ placement: "top" }}>
              <BubbleToolbar editor={editor} />
            </BubbleMenu>
          ) : null}
        </div>

        <p className="hidden border-t border-admin-line px-7 py-3 text-[13px] text-admin-muted lg:block">
          {t.shortcuts}
        </p>
      </div>

      {editor ? <EditorToolbar editor={editor} phone className="lg:hidden" /> : null}

      {isVisit ? (
        <DeleteNoteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          noteId={note.id}
          title={title || note.title}
          dateLabel={formatShortDate(note.visitDate ?? visitDate)}
          onDeleted={() => {
            release();
            toast.success(t.deleted);
            router.replace(clientNotesPath(clientId));
          }}
        />
      ) : null}
    </section>
  );
}
