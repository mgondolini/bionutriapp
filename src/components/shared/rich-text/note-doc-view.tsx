import { ExternalLink } from "lucide-react";
import { Fragment, type ReactNode } from "react";

import { copy } from "@/lib/copy/it";
import type {
  NoteDoc,
  NoteMark,
  NoteNode,
} from "@/lib/domain/client-notes/content";
import { normalizeLinkHref } from "@/lib/domain/client-notes/links";
import { cn } from "@/lib/utils";

/*
 * Nota formattata mostrata al cliente (nota dei video, C15 e C16). Si rende
 * il documento dell'editor, già ripulito dal server al salvataggio, con
 * elementi React: niente HTML grezzo. Gli indirizzi dei link si ricontrollano
 * qui (https, http, mailto) e si aprono sempre in una nuova scheda.
 */

type TextNode = Extract<NoteNode, { type: "text" }>;
type InlineNode = TextNode | { type: "hardBreak" };

const hasMark = (node: TextNode, type: NoteMark["type"]) =>
  node.marks?.some((mark) => mark.type === type) ?? false;

const hrefOf = (node: InlineNode): string | null => {
  if (node.type !== "text") return null;
  const link = node.marks?.find((mark) => mark.type === "link");
  return link && "attrs" in link ? normalizeLinkHref(link.attrs.href) : null;
};

/** Grassetto, corsivo ed evidenziatore di un pezzo di testo. */
function styled(node: TextNode, key: number, preview: boolean): ReactNode {
  let content: ReactNode = node.text;
  if (!preview && hasMark(node, "highlight")) {
    content = (
      <mark className="rounded-[3px] bg-warm px-[3px] text-foreground">
        {content}
      </mark>
    );
  }
  if (hasMark(node, "italic")) content = <em>{content}</em>;
  if (hasMark(node, "bold")) {
    content = <strong className="font-bold">{content}</strong>;
  }
  return <Fragment key={key}>{content}</Fragment>;
}

/**
 * Testo di un blocco: i pezzi consecutivi con lo stesso indirizzo formano un
 * solo link (un grassetto dentro il link spezza il testo in più nodi).
 */
function inline(nodes: NoteNode[] | undefined, preview: boolean): ReactNode[] {
  const out: ReactNode[] = [];
  const list = (nodes ?? []) as InlineNode[];
  for (let i = 0; i < list.length;) {
    const node = list[i]!;
    const href = hrefOf(node);
    if (!href) {
      out.push(
        node.type === "hardBreak" ? (
          preview ? (
            " "
          ) : (
            <br key={i} />
          )
        ) : (
          styled(node, i, preview)
        ),
      );
      i += 1;
      continue;
    }
    const start = i;
    const parts: ReactNode[] = [];
    while (i < list.length && hrefOf(list[i]!) === href) {
      parts.push(styled(list[i] as TextNode, i, preview));
      i += 1;
    }
    out.push(
      preview ? (
        // nell'anteprima il link non si tocca: la card apre il video
        <span key={`l${start}`} className="font-semibold underline">
          {parts}
        </span>
      ) : (
        <a
          key={`l${start}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-foreground underline underline-offset-2 hover:decoration-2 focus-visible:rounded-[3px] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {parts}
          <ExternalLink
            aria-hidden="true"
            strokeWidth={1.8}
            className="ml-1 inline size-3.5 align-[-2px]"
          />
          <span className="sr-only"> {copy.clientNotes.newTab}</span>
        </a>
      ),
    );
  }
  return out;
}

function block(node: NoteNode, key: number): ReactNode {
  switch (node.type) {
    case "paragraph":
      return <p key={key}>{inline(node.content, false)}</p>;
    case "heading":
      return node.attrs.level === 2 ? (
        <h3 key={key} className="text-base font-bold">
          {inline(node.content, false)}
        </h3>
      ) : (
        <h4 key={key} className="font-bold">
          {inline(node.content, false)}
        </h4>
      );
    case "bulletList":
      return (
        <ul key={key} className="list-disc pl-5">
          {node.content.map(block)}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} start={node.attrs?.start} className="list-decimal pl-5">
          {node.content.map(block)}
        </ol>
      );
    case "listItem":
      return (
        <li key={key} className="pl-0.5 [&>p+p]:mt-1">
          {node.content.map(block)}
        </li>
      );
    default:
      return null;
  }
}

/** Testo di tutti i blocchi in fila, separati da uno spazio (anteprima). */
function flatten(nodes: NoteNode[]): NoteNode[] {
  return nodes.flatMap((node): NoteNode[] => {
    if (node.type === "paragraph" || node.type === "heading") {
      return [...(node.content ?? []), { type: "text", text: " " }];
    }
    if ("content" in node && Array.isArray(node.content)) {
      return flatten(node.content);
    }
    return [];
  });
}

/**
 * La nota completa (C16, 15/22 px) oppure l'anteprima su una riga di testo
 * (C15: grassetto mantenuto, link sottolineati e non cliccabili, da
 * tagliare con `line-clamp`).
 */
export function NoteDocView({
  doc,
  preview = false,
  className,
}: {
  doc: NoteDoc;
  preview?: boolean;
  className?: string;
}) {
  if (preview) {
    // span (non p): l'anteprima sta dentro il link della riga
    return (
      <span className={cn("block", className)}>
        {inline(flatten(doc.content), true)}
      </span>
    );
  }
  return (
    <div
      className={cn(
        "flex flex-col gap-2 text-[15px] leading-[22px] text-foreground [&_ol]:flex [&_ol]:flex-col [&_ol]:gap-0.5 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-0.5",
        className,
      )}
    >
      {doc.content.map(block)}
    </div>
  );
}
