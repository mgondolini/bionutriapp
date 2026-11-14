/**
 * Documento delle note formattate (note cliniche e nota dei video): il JSON
 * di ProseMirror/Tiptap, limitato agli elementi dell'editor (paragrafo,
 * titoli h2 e h3, elenchi, a capo; grassetto, corsivo, evidenziatore; il
 * link solo dove è ammesso, cioè nella nota dei video). Funzioni pure,
 * senza Tiptap: le usa il server per pulire ciò che arriva dal browser e
 * ricavare il testo semplice (content_text, note_text), e il componente che
 * mostra la nota al cliente.
 */
import { ANAMNESIS_TEMPLATE_HEADINGS } from "@/lib/constants/domain";

import { normalizeLinkHref } from "./links";

export type NoteMark =
  | { type: "bold" | "italic" | "highlight" }
  | { type: "link"; attrs: { href: string } };

/** Opzioni della pulizia: i link sono ammessi solo nella nota dei video. */
export type SanitizeOptions = { links?: boolean };

export type NoteNode =
  | { type: "text"; text: string; marks?: NoteMark[] }
  | { type: "hardBreak" }
  | { type: "paragraph"; content?: NoteNode[] }
  | { type: "heading"; attrs: { level: 2 | 3 }; content?: NoteNode[] }
  | { type: "bulletList"; content: NoteNode[] }
  | { type: "orderedList"; attrs?: { start: number }; content: NoteNode[] }
  | { type: "listItem"; content: NoteNode[] };

export type NoteDoc = { type: "doc"; content: NoteNode[] };

export function emptyNoteDoc(): NoteDoc {
  return { type: "doc", content: [] };
}

const MARKS = new Set(["bold", "italic", "highlight"]);
const MAX_DEPTH = 20;

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function children(
  node: Raw,
  depth: number,
  options: SanitizeOptions,
): NoteNode[] | null {
  if (node.content === undefined) return [];
  if (!Array.isArray(node.content)) return null;
  const out: NoteNode[] = [];
  for (const child of node.content) {
    const clean = cleanNode(child, depth + 1, options);
    if (clean === null) return null;
    out.push(clean);
  }
  return out;
}

function cleanMarks(
  value: unknown,
  options: SanitizeOptions,
): NoteMark[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return null;
  const out: NoteMark[] = [];
  for (const mark of value) {
    if (!isRecord(mark) || typeof mark.type !== "string") return null;
    if (out.some((m) => m.type === mark.type)) continue;
    if (mark.type === "link") {
      // solo l'indirizzo, ripulito: target e rel li decide chi mostra la nota;
      // un indirizzo non ammesso (javascript:, data:…) toglie il link, il testo resta
      const href =
        options.links &&
        isRecord(mark.attrs) &&
        typeof mark.attrs.href === "string"
          ? normalizeLinkHref(mark.attrs.href)
          : null;
      if (href) out.push({ type: "link", attrs: { href } });
      continue;
    }
    // un segno non previsto (colore, sottolineato) si scarta, il testo resta
    if (MARKS.has(mark.type)) {
      out.push({ type: mark.type as "bold" | "italic" | "highlight" });
    }
  }
  return out;
}

function cleanNode(
  value: unknown,
  depth: number,
  options: SanitizeOptions,
): NoteNode | null {
  if (depth > MAX_DEPTH || !isRecord(value)) return null;
  switch (value.type) {
    case "text": {
      if (typeof value.text !== "string" || value.text === "") return null;
      const marks = cleanMarks(value.marks, options);
      if (marks === null) return null;
      return marks.length
        ? { type: "text", text: value.text, marks }
        : { type: "text", text: value.text };
    }
    case "hardBreak":
      return { type: "hardBreak" };
    case "paragraph": {
      const content = inline(value, depth, options);
      if (content === null) return null;
      return content.length
        ? { type: "paragraph", content }
        : { type: "paragraph" };
    }
    case "heading": {
      const level = isRecord(value.attrs) ? value.attrs.level : undefined;
      if (level !== 2 && level !== 3) return null;
      const content = inline(value, depth, options);
      if (content === null) return null;
      return content.length
        ? { type: "heading", attrs: { level }, content }
        : { type: "heading", attrs: { level } };
    }
    case "bulletList":
    case "orderedList": {
      const items = children(value, depth, options);
      if (!items?.length || items.some((i) => i.type !== "listItem")) {
        return null;
      }
      if (value.type === "bulletList") {
        return { type: "bulletList", content: items };
      }
      const start = isRecord(value.attrs) ? value.attrs.start : undefined;
      return typeof start === "number" &&
        Number.isInteger(start) &&
        start > 1 &&
        start < 100_000
        ? { type: "orderedList", attrs: { start }, content: items }
        : { type: "orderedList", content: items };
    }
    case "listItem": {
      const content = children(value, depth, options);
      if (
        !content?.length ||
        content.some(
          (c) =>
            c.type !== "paragraph" &&
            c.type !== "bulletList" &&
            c.type !== "orderedList",
        )
      ) {
        return null;
      }
      return { type: "listItem", content };
    }
    default:
      return null;
  }
}

function inline(
  node: Raw,
  depth: number,
  options: SanitizeOptions,
): NoteNode[] | null {
  const content = children(node, depth, options);
  if (content === null) return null;
  return content.every((c) => c.type === "text" || c.type === "hardBreak")
    ? content
    : null;
}

/**
 * Documento ricostruito con soli nodi, segni e attributi previsti; null se
 * la struttura non è valida (nodo sconosciuto, nesting sbagliato).
 */
export function sanitizeNoteDoc(
  value: unknown,
  options: SanitizeOptions = {},
): NoteDoc | null {
  if (!isRecord(value) || value.type !== "doc") return null;
  const content = children(value, 0, options);
  if (content === null) return null;
  const blocks = new Set(["paragraph", "heading", "bulletList", "orderedList"]);
  if (content.some((c) => !blocks.has(c.type))) return null;
  return { type: "doc", content };
}

/** Dimensione in byte (UTF-8) del JSON, come stringa o come oggetto. */
export function noteDocBytes(doc: unknown): number {
  const json = typeof doc === "string" ? doc : JSON.stringify(doc);
  return new TextEncoder().encode(json ?? "").length;
}

function inlineText(nodes: NoteNode[] | undefined): string {
  return (nodes ?? [])
    .map((n) =>
      n.type === "text" ? n.text : n.type === "hardBreak" ? "\n" : "",
    )
    .join("");
}

function blockLines(node: NoteNode, prefix: string): string[] {
  switch (node.type) {
    case "paragraph":
    case "heading":
      return [prefix + inlineText(node.content)];
    case "bulletList":
      return node.content.flatMap((item) => blockLines(item, "- "));
    case "orderedList": {
      const start = node.attrs?.start ?? 1;
      return node.content.flatMap((item, i) =>
        blockLines(item, `${start + i}. `),
      );
    }
    case "listItem":
      return node.content.flatMap((child, i) =>
        blockLines(child, i === 0 ? prefix : "  "),
      );
    default:
      return [];
  }
}

/**
 * Caratteri di testo visibile (solo il testo: niente formattazione, segni
 * degli elenchi o a capo). È il conteggio del limite della nota dei video.
 */
export function noteVisibleLength(doc: NoteDoc): number {
  const count = (nodes: NoteNode[] | undefined): number =>
    (nodes ?? []).reduce(
      (total, node) =>
        total +
        (node.type === "text"
          ? [...node.text].length
          : "content" in node
            ? count(node.content)
            : 0),
      0,
    );
  return count(doc.content);
}

/** Testo semplice: un blocco per riga, elenchi con "- " e "1. ", senza righe vuote. */
export function noteContentToText(doc: NoteDoc): string {
  return doc.content
    .flatMap((node) => blockLines(node, ""))
    .flatMap((line) => line.split("\n"))
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== "")
    .join("\n");
}

/**
 * Anteprima nell'elenco: la prima riga che non è un titolo della traccia
 * (altrimenti un'anamnesi appena impostata mostrerebbe "Obiettivo").
 */
export function noteExcerpt(text: string): string {
  const headings = new Set<string>(ANAMNESIS_TEMPLATE_HEADINGS);
  return (
    text
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line !== "" && !headings.has(line)) ?? ""
  );
}

/** Documento senza testo (solo paragrafi vuoti): equivale a nessuna nota. */
export function isEmptyDoc(doc: NoteDoc): boolean {
  return (doc.content ?? []).every(
    (node) => node.type === "paragraph" && !node.content?.length,
  );
}

/**
 * "Inserisci traccia": i titoli standard (h2) con un paragrafo vuoto sotto,
 * in fondo al testo esistente, che non viene toccato. Un documento vuoto
 * diventa la sola traccia (Tiptap lo restituisce anche senza `content`).
 */
export function appendAnamnesisTemplate(doc: NoteDoc): NoteDoc {
  const template: NoteNode[] = ANAMNESIS_TEMPLATE_HEADINGS.flatMap(
    (heading): NoteNode[] => [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: heading }],
      },
      { type: "paragraph" },
    ],
  );
  return {
    type: "doc",
    content: isEmptyDoc(doc) ? template : [...(doc.content ?? []), ...template],
  };
}
