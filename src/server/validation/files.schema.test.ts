import { describe, expect, it } from "vitest";

import { FILE_MAX_BYTES } from "@/lib/constants/domain";

import {
  confirmUploadSchema,
  fileCategoryParamSchema,
  openFileSchema,
  prepareUploadSchema,
} from "./files.schema";

const CLIENT = "aaaaaaaa-2222-4000-8000-000000000001";
const valid = {
  clientId: CLIENT,
  category: "diet",
  title: "  Piano alimentare ottobre ",
  validFrom: "2026-10-16",
  note: "",
  notify: true,
  fileName: "piano.pdf",
  fileType: "application/pdf",
  fileSize: 1024,
};

describe("prepareUploadSchema", () => {
  it("accetta un PDF valido e normalizza titolo e nota", () => {
    const parsed = prepareUploadSchema.parse(valid);
    expect(parsed.title).toBe("Piano alimentare ottobre");
    expect(parsed.note).toBeNull();
  });

  it("accetta un PDF di esattamente 10 MB e un tipo vuoto", () => {
    expect(
      prepareUploadSchema.safeParse({ ...valid, fileSize: FILE_MAX_BYTES })
        .success,
    ).toBe(true);
    expect(
      prepareUploadSchema.safeParse({ ...valid, fileType: "" }).success,
    ).toBe(true);
  });

  it.each([
    [
      "oltre 10 MB",
      { fileSize: FILE_MAX_BYTES + 1 },
      "Il file supera i 10 MB.",
    ],
    ["vuoto", { fileSize: 0 }, "Il file è vuoto."],
    [
      "non PDF (estensione)",
      { fileName: "piano.docx" },
      "Puoi caricare solo file PDF.",
    ],
    [
      "non PDF (tipo)",
      { fileType: "application/msword" },
      "Puoi caricare solo file PDF.",
    ],
    ["categoria sconosciuta", { category: "ricetta" }, "Scegli una categoria."],
    ["senza titolo", { title: "   " }, "Inserisci il titolo."],
    [
      "titolo troppo lungo",
      { title: "x".repeat(151) },
      "Massimo 150 caratteri.",
    ],
    [
      "senza data di validità",
      { validFrom: "" },
      "Inserisci una data di validità.",
    ],
    [
      "data non valida",
      { validFrom: "2026-02-30" },
      "Inserisci una data di validità.",
    ],
    [
      "nota oltre 500 caratteri",
      { note: "x".repeat(501) },
      "Massimo 500 caratteri.",
    ],
  ])("rifiuta un file %s", (_, change, message) => {
    const result = prepareUploadSchema.safeParse({ ...valid, ...change });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((i) => i.message)).toContain(message);
  });

  it("accetta una nota di 500 caratteri, come testo semplice", () => {
    const note = "<b>".padEnd(500, "x");
    expect(prepareUploadSchema.parse({ ...valid, note }).note).toBe(note);
  });

  it("rifiuta un cliente che non è un uuid", () => {
    expect(
      prepareUploadSchema.safeParse({ ...valid, clientId: "../altro" }).success,
    ).toBe(false);
  });
});

describe("confirmUploadSchema", () => {
  it("dal browser arriva solo l'id del file, mai un percorso", () => {
    const { fileName, fileType, fileSize, ...metadata } = valid;
    void fileName;
    void fileType;
    void fileSize;
    expect(
      confirmUploadSchema.safeParse({
        ...metadata,
        fileId: "3f0e8a52-0d8b-4c47-9a35-1b7f3e1d0002",
      }).success,
    ).toBe(true);
    expect(
      confirmUploadSchema.safeParse({ ...metadata, fileId: "a/b.pdf" }).success,
    ).toBe(false);
  });
});

describe("openFileSchema e filtro", () => {
  it("accetta solo view e download", () => {
    const fileId = "3f0e8a52-0d8b-4c47-9a35-1b7f3e1d0002";
    expect(openFileSchema.safeParse({ fileId, mode: "view" }).success).toBe(
      true,
    );
    expect(openFileSchema.safeParse({ fileId, mode: "edit" }).success).toBe(
      false,
    );
  });
  it("un filtro non valido vale tutte le categorie", () => {
    expect(fileCategoryParamSchema.parse("report")).toBe("report");
    expect(fileCategoryParamSchema.parse("x")).toBeNull();
    expect(fileCategoryParamSchema.parse(null)).toBeNull();
  });
});
