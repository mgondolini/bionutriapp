import { describe, expect, it } from "vitest";

import { ANAMNESIS_TEMPLATE_HEADINGS } from "@/lib/constants/domain";
import { formatTimeInRome } from "@/lib/format";

import {
  appendAnamnesisTemplate,
  emptyNoteDoc,
  noteContentToText,
  noteDocBytes,
  noteExcerpt,
  sanitizeNoteDoc,
  type NoteDoc,
} from "./content";
import { sortNotes, updatedDay } from "./list";

const text = (value: string, marks?: string[]) => ({
  type: "text",
  text: value,
  ...(marks ? { marks: marks.map((type) => ({ type })) } : {}),
});

const sample = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [text("Obiettivo")],
    },
    {
      type: "paragraph",
      content: [
        text("Perdita di peso", ["highlight"]),
        text(" graduale e "),
        text("glicemia", ["bold", "italic"]),
      ],
    },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [{ type: "paragraph", content: [text("Insulino-resistenza")] }],
        },
        {
          type: "listItem",
          content: [
            { type: "paragraph", content: [text("Ipotiroidismo")] },
            {
              type: "orderedList",
              attrs: { start: 1, type: null },
              content: [
                {
                  type: "listItem",
                  content: [{ type: "paragraph", content: [text("Al mattino")] }],
                },
              ],
            },
          ],
        },
      ],
    },
    { type: "paragraph" },
    {
      type: "orderedList",
      attrs: { start: 3 },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [text("Prima"), { type: "hardBreak" }, text("riga due")],
            },
          ],
        },
      ],
    },
  ],
};

describe("sanitizeNoteDoc", () => {
  it("tiene nodi, segni e attributi previsti", () => {
    const doc = sanitizeNoteDoc(sample);
    expect(doc).not.toBeNull();
    // attrs non previsti (type dell'elenco numerato, start = 1) spariscono
    expect(JSON.stringify(doc)).not.toContain('"type":null');
    expect(doc?.content[4]).toMatchObject({ attrs: { start: 3 } });
  });

  it("scarta i segni non previsti ma tiene il testo", () => {
    const doc = sanitizeNoteDoc({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "link",
              marks: [
                { type: "link", attrs: { href: "javascript:alert(1)" } },
                { type: "bold" },
                { type: "bold" },
                { type: "highlight", attrs: { color: "#ff0000" } },
              ],
            },
          ],
        },
      ],
    });
    expect(doc).toEqual({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "link",
              marks: [{ type: "bold" }, { type: "highlight" }],
            },
          ],
        },
      ],
    });
  });

  it.each([
    ["non un documento", { type: "paragraph" }],
    ["contenuto non array", { type: "doc", content: "x" }],
    [
      "nodo sconosciuto",
      { type: "doc", content: [{ type: "image", attrs: { src: "x" } }] },
    ],
    [
      "titolo h1",
      { type: "doc", content: [{ type: "heading", attrs: { level: 1 } }] },
    ],
    [
      "testo fuori da un paragrafo",
      { type: "doc", content: [text("libero")] },
    ],
    [
      "elenco senza voci",
      { type: "doc", content: [{ type: "bulletList", content: [] }] },
    ],
    [
      "elenco dentro un paragrafo",
      {
        type: "doc",
        content: [{ type: "paragraph", content: [{ type: "bulletList" }] }],
      },
    ],
    [
      "testo vuoto",
      { type: "doc", content: [{ type: "paragraph", content: [text("")] }] },
    ],
  ])("rifiuta: %s", (_, value) => {
    expect(sanitizeNoteDoc(value)).toBeNull();
  });

  it("rifiuta un annidamento troppo profondo", () => {
    let node: Record<string, unknown> = {
      type: "paragraph",
      content: [text("fondo")],
    };
    for (let i = 0; i < 15; i++) {
      node = {
        type: "bulletList",
        content: [{ type: "listItem", content: [{ type: "paragraph" }, node] }],
      };
    }
    expect(sanitizeNoteDoc({ type: "doc", content: [node] })).toBeNull();
  });
});

describe("noteContentToText", () => {
  it("una riga per blocco, elenchi con trattino e numero", () => {
    const doc = sanitizeNoteDoc(sample) as NoteDoc;
    expect(noteContentToText(doc)).toBe(
      [
        "Obiettivo",
        "Perdita di peso graduale e glicemia",
        "- Insulino-resistenza",
        "- Ipotiroidismo",
        "1. Al mattino",
        "3. Prima",
        "riga due",
      ].join("\n"),
    );
  });

  it("documento vuoto = testo vuoto", () => {
    expect(noteContentToText(emptyNoteDoc())).toBe("");
  });
});

describe("noteExcerpt", () => {
  it("salta i titoli della traccia e le righe vuote", () => {
    expect(noteExcerpt("Obiettivo\n\nPeso stabile\nAltro")).toBe(
      "Peso stabile",
    );
    expect(noteExcerpt(ANAMNESIS_TEMPLATE_HEADINGS.join("\n"))).toBe("");
  });
});

describe("appendAnamnesisTemplate", () => {
  const headings = (doc: NoteDoc) =>
    doc.content
      .filter((n) => n.type === "heading")
      .map((n) => noteContentToText({ type: "doc", content: [n] }));

  it("un documento vuoto diventa la sola traccia", () => {
    for (const empty of [
      emptyNoteDoc(),
      { type: "doc", content: [{ type: "paragraph" }] } as NoteDoc,
    ]) {
      const doc = appendAnamnesisTemplate(empty);
      expect(headings(doc)).toEqual([...ANAMNESIS_TEMPLATE_HEADINGS]);
      expect(doc.content).toHaveLength(ANAMNESIS_TEMPLATE_HEADINGS.length * 2);
    }
  });

  it("aggiunge in fondo senza toccare il testo esistente", () => {
    const before = sanitizeNoteDoc(sample) as NoteDoc;
    const doc = appendAnamnesisTemplate(before);
    expect(doc.content.slice(0, before.content.length)).toEqual(before.content);
    expect(doc.content[before.content.length]).toEqual({
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Obiettivo" }],
    });
    expect(sanitizeNoteDoc(doc)).toEqual(doc);
  });
});

describe("noteDocBytes", () => {
  it("conta i byte UTF-8", () => {
    expect(noteDocBytes({ a: "è" })).toBe(10);
  });
});

describe("sortNotes", () => {
  it("anamnesi in cima, poi visite dalla più recente", () => {
    const notes = [
      { id: "v1", kind: "visit", visitDate: "2026-09-15", createdAt: "2026-09-15T10:00:00Z" },
      { id: "a", kind: "anamnesis", visitDate: null, createdAt: "2026-09-15T09:00:00Z" },
      { id: "v3", kind: "visit", visitDate: "2026-11-10", createdAt: "2026-11-10T10:00:00Z" },
      { id: "v2b", kind: "visit", visitDate: "2026-10-13", createdAt: "2026-10-13T12:00:00Z" },
      { id: "v2a", kind: "visit", visitDate: "2026-10-13", createdAt: "2026-10-13T09:00:00Z" },
    ] as const;
    expect(sortNotes(notes).map((n) => n.id)).toEqual([
      "a",
      "v3",
      "v2b",
      "v2a",
      "v1",
    ]);
  });
});

describe("updatedDay e ora", () => {
  it("oggi, ieri, altro", () => {
    expect(updatedDay("2026-11-12", "2026-11-12", "2026-11-11")).toBe("today");
    expect(updatedDay("2026-11-11", "2026-11-12", "2026-11-11")).toBe(
      "yesterday",
    );
    expect(updatedDay("2026-11-01", "2026-11-12", "2026-11-11")).toBe("other");
  });

  it("ora a Roma, con l'ora legale", () => {
    expect(formatTimeInRome("2026-11-12T17:42:00Z")).toBe("18:42");
    expect(formatTimeInRome("2026-07-12T17:42:00Z")).toBe("19:42");
  });
});
