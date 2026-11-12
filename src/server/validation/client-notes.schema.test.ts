import { describe, expect, it } from "vitest";

import { CLIENT_NOTE_CONTENT_MAX_BYTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { addDays, todayInRome } from "@/lib/domain/tracking/dates";

import { saveNoteSchema } from "./client-notes.schema";

const e = copy.clientNotes.errors;
const doc = {
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Ok" }] }],
};
const base = {
  noteId: "3f0e8a52-0d8b-4c47-9a35-1b7f3e1d0002",
  title: "  Visita di controllo ",
  visitDate: todayInRome(),
  content: JSON.stringify(doc),
  expectedUpdatedAt: "2026-11-12T17:42:00.123456+00:00",
};

function firstError(input: unknown) {
  const parsed = saveNoteSchema.safeParse(input);
  return parsed.success ? null : parsed.error.issues[0]?.message;
}

describe("saveNoteSchema", () => {
  it("accetta una nota valida, toglie gli spazi e force è falso", () => {
    const parsed = saveNoteSchema.parse(base);
    expect(parsed.title).toBe("Visita di controllo");
    expect(parsed.force).toBe(false);
  });

  it("anamnesi senza data", () => {
    expect(saveNoteSchema.safeParse({ ...base, visitDate: null }).success).toBe(
      true,
    );
  });

  it.each([
    ["titolo vuoto", { title: "   " }, e.titleRequired],
    ["titolo lungo", { title: "a".repeat(121) }, e.titleTooLong],
    ["data futura", { visitDate: addDays(todayInRome(), 1) }, e.dateFuture],
    ["data non valida", { visitDate: "12/11/2026" }, e.dateRequired],
    [
      "contenuto non previsto",
      { content: JSON.stringify({ type: "doc", content: [{ type: "image" }] }) },
      e.contentInvalid,
    ],
    ["JSON non valido", { content: "{non json" }, e.contentInvalid],
    ["oggetto invece della stringa", { content: doc }, null],
  ])("rifiuta: %s", (_, change, message) => {
    const error = firstError({ ...base, ...change });
    if (message) expect(error).toBe(message);
    else expect(error).toBeTruthy();
  });

  it("titolo di 120 caratteri accettato", () => {
    expect(firstError({ ...base, title: "a".repeat(120) })).toBeNull();
  });

  it("rifiuta un contenuto oltre 200 KB", () => {
    const text = "x".repeat(CLIENT_NOTE_CONTENT_MAX_BYTES);
    expect(
      firstError({
        ...base,
        content: JSON.stringify({
          type: "doc",
          content: [{ type: "paragraph", content: [{ type: "text", text }] }],
        }),
      }),
    ).toBe(e.contentTooLarge);
  });

  it("il contenuto salvato è quello ripulito", () => {
    const parsed = saveNoteSchema.parse({
      ...base,
      content: JSON.stringify({
        type: "doc",
        content: [
          {
            type: "paragraph",
            attrs: { style: "color:red" },
            content: [
              { type: "text", text: "Ok", marks: [{ type: "textStyle" }] },
            ],
          },
        ],
      }),
    });
    expect(parsed.content).toEqual(doc);
  });
});
