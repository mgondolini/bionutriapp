"use client";

import Highlight from "@tiptap/extension-highlight";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
  type JSONContent,
} from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import { useRef, useState } from "react";

import {
  noteVisibleLength,
  type NoteDoc,
} from "@/lib/domain/client-notes/content";
import { normalizeLinkHref } from "@/lib/domain/client-notes/links";
import { useMediaQuery } from "@/lib/use-media-query";
import { cn } from "@/lib/utils";

import { cleanPastedHtml } from "./clean-pasted-html";
import { BubbleToolbar, EditorToolbar } from "./editor-toolbar";
import { LinkDialog, type LinkDraft } from "./link-dialog";

/** Testo della nota nel campo: come le note cliniche, più compatto, con i link. */
const CONTENT_CLASS = cn(
  "min-h-[140px] px-4 py-3 text-[15px] leading-[1.6] text-foreground outline-none",
  "[&_h2]:mt-4 [&_h2]:mb-1.5 [&_h2]:text-lg [&_h2]:font-bold [&_h2:first-child]:mt-0",
  "[&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-bold [&_h3:first-child]:mt-0",
  "[&_p+p]:mt-2 [&_strong]:font-bold",
  "[&_ul]:my-1.5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:pl-1",
  "[&_mark]:rounded-[3px] [&_mark]:bg-warm [&_mark]:px-[3px] [&_mark]:text-foreground",
  "[&_a]:font-semibold [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2",
);

/** Sotto `lg` niente barra flottante: c'è già la barra sopra il testo. */
const NARROW_QUERY = "(max-width: 1023.98px)";

function parseDoc(value: string): JSONContent | undefined {
  if (!value.trim()) return undefined;
  try {
    return JSON.parse(value) as JSONContent;
  } catch {
    return undefined;
  }
}

/** Testo selezionato e indirizzo del link sotto il cursore (tutto il link). */
function currentLink(editor: Editor): { draft: LinkDraft; editing: boolean } {
  const editing = editor.isActive("link");
  if (editing) editor.chain().extendMarkRange("link").run();
  const { from, to } = editor.state.selection;
  return {
    editing,
    draft: {
      text: editor.state.doc.textBetween(from, to, " "),
      href: editing ? String(editor.getAttributes("link").href ?? "") : "",
    },
  };
}

/**
 * Campo "Nota per i clienti" del video (A14): lo stesso editor delle note
 * cliniche (barra, barra rapida alla selezione, incolla ripulito) più il
 * link, con il contatore del testo visibile. Il valore è il documento come
 * stringa JSON (stesso formato che il server ricontrolla e ripulisce).
 */
export function RichNoteField({
  id,
  value,
  onChange,
  onBlur,
  label,
  placeholder,
  describedBy,
  invalid,
  onCount,
}: {
  id: string;
  /** Valore iniziale (JSON del documento o ""): il campo poi è autonomo. */
  value: string;
  onChange: (json: string) => void;
  onBlur?: () => void;
  /** Nome accessibile dell'area di testo. */
  label: string;
  placeholder: string;
  describedBy?: string;
  invalid?: boolean;
  /** Caratteri di testo visibile, a ogni modifica (contatore). */
  onCount?: (count: number) => void;
}) {
  const narrow = useMediaQuery(NARROW_QUERY);
  const [link, setLink] = useState<{
    open: boolean;
    draft: LinkDraft;
    editing: boolean;
  }>({ open: false, draft: { text: "", href: "" }, editing: false });

  const openLink = (current: Editor) => {
    setLink({ open: true, ...currentLink(current) });
  };
  // l'editor per la scorciatoia Ctrl/Cmd+K (editorProps resta quello del primo render)
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: false,
          linkOnPaste: false,
          defaultProtocol: "https",
          isAllowedUri: (url) => normalizeLinkHref(url) !== null,
          HTMLAttributes: {
            target: "_blank",
            rel: "noopener noreferrer",
            class: null,
          },
        },
      }),
      Highlight.configure({ multicolor: false }),
    ],
    content: parseDoc(value),
    editorProps: {
      attributes: {
        id,
        class: CONTENT_CLASS,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(invalid ? { "aria-invalid": "true" } : {}),
      },
      transformPastedHTML: cleanPastedHtml,
      handleKeyDown: (_view, event) => {
        if (
          (event.ctrlKey || event.metaKey) &&
          event.key.toLowerCase() === "k"
        ) {
          event.preventDefault();
          if (editorRef.current) openLink(editorRef.current);
          return true;
        }
        return false;
      },
    },
    onCreate: ({ editor: created }) => {
      editorRef.current = created;
      onCount?.(noteVisibleLength(created.getJSON() as NoteDoc));
    },
    onUpdate: ({ editor: updated }) => {
      const doc = updated.getJSON() as NoteDoc;
      onCount?.(noteVisibleLength(doc));
      onChange(updated.isEmpty ? "" : JSON.stringify(doc));
    },
    onBlur: () => onBlur?.(),
  });
  const empty = useEditorState({
    editor,
    selector: ({ editor: current }) => current?.isEmpty ?? true,
  });

  const applyLink = ({ text, href }: LinkDraft) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (link.draft.text && text === link.draft.text) {
      chain.extendMarkRange("link").setLink({ href }).run();
    } else {
      chain
        .insertContent({
          type: "text",
          text,
          marks: [{ type: "link", attrs: { href } }],
        })
        .unsetMark("link")
        .run();
    }
    setLink((current) => ({ ...current, open: false }));
  };

  const removeLink = () => {
    editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    setLink((current) => ({ ...current, open: false }));
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[14px] border bg-card focus-within:border-primary focus-within:ring-3 focus-within:ring-mint",
        invalid ? "border-warning-foreground" : "border-input",
      )}
    >
      {editor ? (
        <EditorToolbar
          editor={editor}
          onLink={() => openLink(editor)}
          className="gap-1 overflow-x-auto border-t-0 px-2"
        />
      ) : null}
      <div className="relative">
        {empty ? (
          <p
            aria-hidden="true"
            className="pointer-events-none absolute top-3 left-4 text-[15px] leading-[1.6] text-muted-foreground"
          >
            {placeholder}
          </p>
        ) : null}
        <EditorContent editor={editor} />
        {editor && !narrow ? (
          <BubbleMenu editor={editor} options={{ placement: "top" }}>
            <BubbleToolbar editor={editor} />
          </BubbleMenu>
        ) : null}
      </div>
      <LinkDialog
        open={link.open}
        onOpenChange={(open) => {
          setLink((current) => ({ ...current, open }));
          if (!open) editor?.commands.focus();
        }}
        initial={link.draft}
        editing={link.editing}
        onApply={applyLink}
        onRemove={removeLink}
      />
    </div>
  );
}
