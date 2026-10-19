import { describe, expect, it } from "vitest";

import { FILE_MAX_BYTES } from "@/lib/constants/domain";

import {
  checkDeclaredFile,
  countByCategory,
  downloadFileName,
  filterByCategory,
  hasPdfHeader,
} from "./file-checks";

const bytes = (text: string) => new TextEncoder().encode(text);

describe("hasPdfHeader", () => {
  it("riconosce un PDF dai primi byte", () => {
    expect(hasPdfHeader(bytes("%PDF-1.7\n"))).toBe(true);
  });
  it("rifiuta un .docx rinominato (zip, inizia con PK) e i file troppo corti", () => {
    expect(hasPdfHeader(bytes("PK\u0003\u0004"))).toBe(false);
    expect(hasPdfHeader(bytes("%PDF"))).toBe(false);
    expect(hasPdfHeader(bytes(" %PDF-1.7"))).toBe(false);
  });
});

describe("checkDeclaredFile", () => {
  const pdf = { name: "Piano.PDF", type: "application/pdf", size: 1000 };
  it("accetta un PDF fino a 10 MB, anche con tipo vuoto", () => {
    expect(checkDeclaredFile(pdf)).toBeNull();
    expect(checkDeclaredFile({ ...pdf, type: "" })).toBeNull();
    expect(checkDeclaredFile({ ...pdf, size: FILE_MAX_BYTES })).toBeNull();
  });
  it("rifiuta altri tipi o estensioni", () => {
    expect(checkDeclaredFile({ ...pdf, name: "piano.docx" })).toBe("not_pdf");
    expect(checkDeclaredFile({ ...pdf, type: "application/msword" })).toBe(
      "not_pdf",
    );
  });
  it("rifiuta file vuoti o oltre 10 MB", () => {
    expect(checkDeclaredFile({ ...pdf, size: 0 })).toBe("empty");
    expect(checkDeclaredFile({ ...pdf, size: FILE_MAX_BYTES + 1 })).toBe(
      "too_large",
    );
  });
});

describe("downloadFileName", () => {
  it("ricava il nome dal titolo", () => {
    expect(downloadFileName("Piano alimentare ottobre")).toBe(
      "Piano alimentare ottobre.pdf",
    );
    expect(downloadFileName("Report.pdf")).toBe("Report.pdf");
  });
  it("toglie accenti, caratteri vietati e percorsi", () => {
    expect(downloadFileName("Più proteine: è / ok?")).toBe(
      "Piu proteine e ok.pdf",
    );
    expect(downloadFileName("../../etc/passwd")).toBe("etc passwd.pdf");
    expect(downloadFileName("100% sano")).toBe("100 sano.pdf");
  });
  it("usa un nome predefinito se non resta nulla", () => {
    expect(downloadFileName("???")).toBe("documento.pdf");
  });
});

describe("filtro e conteggi per categoria", () => {
  const files = [
    { category: "diet" as const },
    { category: "diet" as const },
    { category: "report" as const },
  ];
  it("conta per categoria", () => {
    expect(countByCategory(files)).toEqual({
      all: 3,
      diet: 2,
      workout: 0,
      report: 1,
    });
  });
  it("filtra, null = tutte", () => {
    expect(filterByCategory(files, "report")).toHaveLength(1);
    expect(filterByCategory(files, null)).toHaveLength(3);
  });
});
