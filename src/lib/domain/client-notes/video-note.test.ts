import { describe, expect, it } from "vitest";

import { videoNoteSchema } from "@/server/validation/videos.schema";

import {
  noteContentToText,
  noteVisibleLength,
  sanitizeNoteDoc,
  type NoteDoc,
} from "./content";
import { normalizeLinkHref } from "./links";

const linked = (href: string, extra: Record<string, unknown> = {}) => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Approfondisci qui: " },
        {
          type: "text",
          text: "linee guida",
          marks: [{ type: "link", attrs: { href, ...extra } }],
        },
      ],
    },
  ],
});

const marksOf = (doc: NoteDoc | null) =>
  doc?.content[0]?.type === "paragraph"
    ? doc.content[0].content?.flatMap((node) =>
        node.type === "text" ? (node.marks ?? []) : [],
      )
    : undefined;

describe("normalizeLinkHref", () => {
  it.each([
    ["https://www.crea.gov.it", "https://www.crea.gov.it/"],
    ["http://esempio.it/pagina?a=1", "http://esempio.it/pagina?a=1"],
    ["www.crea.gov.it", "https://www.crea.gov.it/"],
    ["crea.gov.it/colazione", "https://crea.gov.it/colazione"],
    ["  https://esempio.it  ", "https://esempio.it/"],
    ["mailto:studio@esempio.it", "mailto:studio@esempio.it"],
    ["studio@esempio.it", "mailto:studio@esempio.it"],
  ])("%s → %s", (raw, expected) => {
    expect(normalizeLinkHref(raw)).toBe(expected);
  });

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    " javascript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD4=",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "ftp://esempio.it",
    "//esempio.it",
    "https://utente:pass@esempio.it",
    "https://localhost",
    "mailto:non valido",
    "con spazi.it",
    "",
  ])("rifiuta %s", (raw) => {
    expect(normalizeLinkHref(raw)).toBeNull();
  });
});

describe("sanitizeNoteDoc con i link", () => {
  it("tiene il link con l'indirizzo ripulito e scarta gli altri attributi", () => {
    const doc = sanitizeNoteDoc(
      linked("www.crea.gov.it", {
        target: "_self",
        rel: "opener",
        onclick: "alert(1)",
        class: "x",
      }),
      { links: true },
    );
    expect(marksOf(doc)).toEqual([
      { type: "link", attrs: { href: "https://www.crea.gov.it/" } },
    ]);
  });

  it.each(["javascript:alert(1)", "data:text/html,<script>", "vbscript:x"])(
    "toglie il link %s ma tiene il testo",
    (href) => {
      const doc = sanitizeNoteDoc(linked(href), { links: true });
      expect(marksOf(doc)).toEqual([]);
      expect(noteContentToText(doc!)).toBe("Approfondisci qui: linee guida");
    },
  );

  it("nelle note cliniche il link non passa", () => {
    expect(marksOf(sanitizeNoteDoc(linked("https://esempio.it")))).toEqual([]);
  });

  it("rifiuta nodi non ammessi (immagini, codice, HTML)", () => {
    for (const node of [
      { type: "image", attrs: { src: "x", onerror: "alert(1)" } },
      { type: "codeBlock", content: [{ type: "text", text: "x" }] },
      { type: "html", text: "<img src=x onerror=alert(1)>" },
      { type: "blockquote", content: [] },
    ]) {
      expect(
        sanitizeNoteDoc({ type: "doc", content: [node] }, { links: true }),
      ).toBeNull();
    }
  });

  it("il testo resta testo: un tag scritto nella nota non diventa HTML", () => {
    const doc = sanitizeNoteDoc(
      {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "<script>alert(1)</script>" }],
          },
        ],
      },
      { links: true },
    );
    expect(noteContentToText(doc!)).toBe("<script>alert(1)</script>");
  });
});

describe("noteVisibleLength", () => {
  it("conta solo il testo, non la formattazione né i segni degli elenchi", () => {
    const doc: NoteDoc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Ciao", marks: [{ type: "bold" }] },
            { type: "hardBreak" },
            { type: "text", text: " mondo" },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "uno" }] },
              ],
            },
          ],
        },
      ],
    };
    expect(noteVisibleLength(doc)).toBe("Ciao mondouno".length);
  });

  it("conta le emoji come un carattere", () => {
    expect(
      noteVisibleLength({
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "🥑" }] },
        ],
      }),
    ).toBe(1);
  });
});

describe("videoNoteSchema", () => {
  const json = (text: string) =>
    JSON.stringify({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text }] }],
    });

  it("vuota o senza testo = nessuna nota", () => {
    expect(videoNoteSchema.parse("")).toBeNull();
    expect(
      videoNoteSchema.parse(JSON.stringify({ type: "doc", content: [] })),
    ).toBeNull();
  });

  it("restituisce documento pulito e testo semplice", () => {
    const result = videoNoteSchema.parse(JSON.stringify(linked("crea.gov.it")));
    expect(result?.text).toBe("Approfondisci qui: linee guida");
    expect(marksOf(result!.doc)).toEqual([
      { type: "link", attrs: { href: "https://crea.gov.it/" } },
    ]);
  });

  it("1000 caratteri visibili passano, 1001 no", () => {
    expect(videoNoteSchema.safeParse(json("a".repeat(1000))).success).toBe(
      true,
    );
    const over = videoNoteSchema.safeParse(json("a".repeat(1001)));
    expect(over.error?.issues[0]?.message).toMatch(/1000 caratteri/);
  });

  it("JSON non valido o struttura sconosciuta: errore", () => {
    expect(videoNoteSchema.safeParse("{non json").success).toBe(false);
    expect(
      videoNoteSchema.safeParse(JSON.stringify({ type: "html" })).success,
    ).toBe(false);
  });
});
