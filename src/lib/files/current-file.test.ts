import { describe, expect, it } from "vitest";

import {
  currentFile,
  currentFileIds,
  latestPublished,
  splitCurrentAndArchive,
  type DatedFile,
} from "./current-file";

const file = (
  id: string,
  validFrom: string | null,
  uploadedAt: string,
  category: DatedFile["category"] = "diet",
): DatedFile => ({ id, category, validFrom, uploadedAt });

const TODAY = "2026-10-16";

describe("currentFile", () => {
  it("sceglie il file con la data di validità più recente non futura", () => {
    const files = [
      file("settembre", "2026-09-14", "2026-09-14T08:00:00Z"),
      file("ottobre", "2026-10-07", "2026-10-07T08:00:00Z"),
      file("novembre", "2026-11-01", "2026-10-15T08:00:00Z"),
    ];
    expect(currentFile(files, TODAY)?.id).toBe("ottobre");
  });

  it("vale anche il file con validità da oggi", () => {
    const files = [
      file("ieri", "2026-10-15", "2026-10-15T08:00:00Z"),
      file("oggi", TODAY, "2026-10-10T08:00:00Z"),
    ];
    expect(currentFile(files, TODAY)?.id).toBe("oggi");
  });

  it("a parità di validità vince l'ultimo caricato", () => {
    const files = [
      file("prima", "2026-10-01", "2026-10-01T08:00:00Z"),
      file("dopo", "2026-10-01", "2026-10-01T09:00:00Z"),
    ];
    expect(currentFile(files, TODAY)?.id).toBe("dopo");
  });

  it("senza data di validità usa il giorno del caricamento a Roma", () => {
    // 23:30 UTC del 16 = 17 ottobre a Roma: domani, quindi non ancora in corso
    const files = [
      file("vecchio", "2026-10-01", "2026-10-01T08:00:00Z"),
      file("stanotte", null, "2026-10-16T23:30:00Z"),
    ];
    expect(currentFile(files, TODAY)?.id).toBe("vecchio");
    expect(currentFile(files, "2026-10-17")?.id).toBe("stanotte");
  });

  it("nessun file in corso se sono tutti futuri o se non ci sono file", () => {
    expect(
      currentFile([file("x", "2026-12-01", "2026-10-01T08:00:00Z")], TODAY),
    ).toBeNull();
    expect(currentFile([], TODAY)).toBeNull();
  });
});

describe("splitCurrentAndArchive", () => {
  it("mette i precedenti e i futuri nell'archivio, dal più recente caricamento", () => {
    const files = [
      file("settembre", "2026-09-14", "2026-09-14T08:00:00Z"),
      file("novembre", "2026-11-01", "2026-10-15T08:00:00Z"),
      file("ottobre", "2026-10-07", "2026-10-07T08:00:00Z"),
    ];
    const { current, archive } = splitCurrentAndArchive(files, TODAY);
    expect(current?.id).toBe("ottobre");
    expect(archive.map((f) => f.id)).toEqual(["novembre", "settembre"]);
  });
});

describe("currentFileIds", () => {
  it("un file in corso per categoria", () => {
    const files = [
      file("dieta-vecchia", "2026-09-01", "2026-09-01T08:00:00Z"),
      file("dieta", "2026-10-01", "2026-10-01T08:00:00Z"),
      file("scheda", "2026-10-05", "2026-10-05T08:00:00Z", "workout"),
      file("report-futuro", "2026-12-01", "2026-10-05T08:00:00Z", "report"),
    ];
    expect([...currentFileIds(files, TODAY)].sort()).toEqual([
      "dieta",
      "scheda",
    ]);
  });
});

describe("latestPublished", () => {
  it("l'ultimo caricato, anche con validità futura", () => {
    const files = [
      file("ottobre", "2026-10-07", "2026-10-07T08:00:00Z"),
      file("novembre", "2026-11-01", "2026-10-15T08:00:00Z", "workout"),
    ];
    expect(latestPublished(files)?.id).toBe("novembre");
    expect(latestPublished([])).toBeNull();
  });
});
