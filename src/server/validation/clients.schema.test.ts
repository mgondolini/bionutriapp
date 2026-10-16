import { describe, expect, it } from "vitest";

import {
  clientListParamsSchema,
  createClientSchema,
  csvImportSchema,
} from "./clients.schema";

describe("createClientSchema", () => {
  it("'Nuovo cliente': solo nome e cellulare, cellulare in E.164", () => {
    const parsed = createClientSchema.parse({
      mode: "new",
      firstName: "  Marco ",
      phone: "333 123 4567",
    });
    expect(parsed).toEqual({
      mode: "new",
      firstName: "Marco",
      phone: "+393331234567",
    });
  });

  it("'Nuovo cliente' ignora i campi della modalità completa", () => {
    const parsed = createClientSchema.parse({
      mode: "new",
      firstName: "Marco",
      phone: "3331234567",
      lastName: "Bianchi",
      email: "m@x.it",
    });
    expect(parsed).not.toHaveProperty("lastName");
    expect(parsed).not.toHaveProperty("email");
  });

  it("'Con dati completi': cognome obbligatorio, email in minuscolo, campi facoltativi vuoti = null", () => {
    expect(
      createClientSchema.parse({
        mode: "full",
        firstName: "Anna",
        lastName: "Rossi",
        phone: "+39 333 1234567",
        email: " Anna.Rossi@Example.IT ",
        birthDate: "1991-03-12",
      }),
    ).toEqual({
      mode: "full",
      firstName: "Anna",
      lastName: "Rossi",
      phone: "+393331234567",
      email: "anna.rossi@example.it",
      birthDate: "1991-03-12",
    });
    expect(
      createClientSchema.parse({
        mode: "full",
        firstName: "Anna",
        lastName: "Rossi",
        phone: "3331234567",
        email: "",
        birthDate: "",
      }),
    ).toMatchObject({ email: null, birthDate: null });
  });

  it("segnala i campi non validi con messaggi in italiano", () => {
    const result = createClientSchema.safeParse({
      mode: "full",
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
      firstName: "Inserisci il nome.",
      lastName: "Inserisci il cognome.",
      phone: "Il numero di cellulare non è valido.",
      email: "Inserisci un indirizzo email valido.",
      birthDate: "Data di nascita non valida.",
    });
  });

  it("rifiuta una modalità sconosciuta", () => {
    expect(
      createClientSchema.safeParse({
        mode: "altro",
        firstName: "A",
        phone: "3331234567",
      }).success,
    ).toBe(false);
  });
});

describe("clientListParamsSchema", () => {
  it("legge filtri e ricerca dall'URL e ignora i valori non validi", () => {
    expect(
      clientListParamsSchema.parse({
        stato: "active",
        fase: "onboarding",
        q: " 333 ",
      }),
    ).toEqual({
      status: "active",
      stage: "onboarding",
      query: "333",
    });
    expect(
      clientListParamsSchema.parse({
        stato: "boh",
        fase: ["paused", "x"],
        q: "",
      }),
    ).toEqual({
      status: undefined,
      stage: "paused",
      query: undefined,
    });
  });
});

describe("csvImportSchema", () => {
  it("rifiuta testi oltre 1 MB", () => {
    expect(
      csvImportSchema.safeParse({ csv: "a".repeat(1024 * 1024) }).success,
    ).toBe(true);
    expect(
      csvImportSchema.safeParse({ csv: "a".repeat(1024 * 1024 + 1) }).success,
    ).toBe(false);
  });
});
