import { describe, expect, it } from "vitest";

import {
  clientListParamsSchema,
  createClientSchema,
  csvImportSchema,
} from "./clients.schema";

describe("createClientSchema", () => {
  it("dati completi e fase: cellulare in E.164, email in minuscolo, facoltativi vuoti = null", () => {
    expect(
      createClientSchema.parse({
        stage: "in_progress",
        firstName: " Anna ",
        lastName: "Rossi",
        phone: "+39 333 1234567",
        email: " Anna.Rossi@Example.IT ",
        birthDate: "1991-03-12",
      }),
    ).toEqual({
      stage: "in_progress",
      firstName: "Anna",
      lastName: "Rossi",
      phone: "+393331234567",
      email: "anna.rossi@example.it",
      birthDate: "1991-03-12",
    });
    expect(
      createClientSchema.parse({
        stage: "onboarding",
        firstName: "Marco",
        lastName: "Bianchi",
        phone: "3331234567",
        email: "",
        birthDate: "",
      }),
    ).toMatchObject({ stage: "onboarding", email: null, birthDate: null });
  });

  it("segnala i campi non validi con messaggi in italiano", () => {
    const result = createClientSchema.safeParse({
      stage: "paused",
      firstName: "",
      lastName: "",
      phone: "123",
      email: "non-email",
      birthDate: "2999-01-01",
    });
    expect(result.success).toBe(false);
    const messages = Object.fromEntries(
      result.error!.issues.map((i) => [i.path[0], i.message]),
    );
    expect(messages).toEqual({
      stage: "Scegli la fase del cliente.",
      firstName: "Inserisci il nome.",
      lastName: "Inserisci il cognome.",
      phone: "Il numero di cellulare non è valido.",
      email: "Inserisci un indirizzo email valido.",
      birthDate: "Data di nascita non valida.",
    });
  });
});

describe("clientListParamsSchema", () => {
  it("legge filtri, ricerca e pagina dall'URL e ignora i valori non validi", () => {
    expect(
      clientListParamsSchema.parse({
        stato: "active",
        fase: "onboarding",
        q: " 333 ",
        pagina: "2",
      }),
    ).toEqual({
      filters: { status: "active", stage: "onboarding", query: "333" },
      page: 2,
    });
    expect(
      clientListParamsSchema.parse({
        stato: "boh",
        fase: ["paused", "x"],
        q: "",
      }),
    ).toEqual({
      filters: { status: undefined, stage: "paused", query: undefined },
      page: 1,
    });
    for (const pagina of ["0", "-1", "abc", "1.5"]) {
      expect(clientListParamsSchema.parse({ pagina }).page).toBe(1);
    }
  });
});

describe("csvImportSchema", () => {
  const stage = "in_progress";

  it("rifiuta testi oltre 1 MB", () => {
    expect(
      csvImportSchema.safeParse({ csv: "a".repeat(1024 * 1024), stage })
        .success,
    ).toBe(true);
    expect(
      csvImportSchema.safeParse({ csv: "a".repeat(1024 * 1024 + 1), stage })
        .success,
    ).toBe(false);
  });

  it("richiede la fase In percorso o Onboarding per tutto il file", () => {
    expect(
      csvImportSchema.safeParse({ csv: "x", stage: "onboarding" }).success,
    ).toBe(true);
    expect(csvImportSchema.safeParse({ csv: "x" }).success).toBe(false);
    expect(
      csvImportSchema.safeParse({ csv: "x", stage: "paused" }).success,
    ).toBe(false);
  });
});
