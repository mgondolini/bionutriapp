import { describe, expect, it } from "vitest";

import {
  cleanClientRows,
  parseBirthDate,
  type ExistingContacts,
} from "./clean-clients";
import { parseClientsCsv } from "./parse-clients-csv";

const NONE: ExistingContacts = { phones: new Set(), emails: new Set() };
const TODAY = new Date("2026-10-16T12:00:00Z");

function clean(csv: string, existing: ExistingContacts = NONE) {
  const parsed = parseClientsCsv(csv);
  if (!parsed.ok) throw new Error(parsed.error);
  return cleanClientRows(parsed.rows, existing, TODAY);
}

describe("parseClientsCsv", () => {
  it("accetta punto e virgola e intestazioni in italiano con maiuscole e accenti", () => {
    const parsed = parseClientsCsv(
      "Nome;Cognome;Cellulare;E-mail;Data di nascita\nAnna;Rossi;333 1234567;anna@x.it;12/03/1991\n",
    );
    expect(parsed).toEqual({
      ok: true,
      rows: [
        {
          line: 2,
          firstName: "Anna",
          lastName: "Rossi",
          phone: "333 1234567",
          email: "anna@x.it",
          birthDate: "12/03/1991",
        },
      ],
    });
  });

  it("accetta la virgola, il BOM e le righe vuote", () => {
    const parsed = parseClientsCsv("\uFEFFnome,telefono\n\nLuca,3331112222\n");
    expect(parsed.ok && parsed.rows).toEqual([
      {
        line: 3,
        firstName: "Luca",
        lastName: "",
        phone: "3331112222",
        email: "",
        birthDate: "",
      },
    ]);
  });

  it("segnala file vuoti, senza colonna del cellulare o troppo lunghi", () => {
    expect(parseClientsCsv("")).toEqual({ ok: false, error: "empty" });
    expect(parseClientsCsv("nome;cellulare\n")).toEqual({
      ok: false,
      error: "empty",
    });
    expect(parseClientsCsv("nome;email\nAnna;a@x.it")).toEqual({
      ok: false,
      error: "missing_phone_column",
    });
    const big =
      "nome;cellulare\n" +
      Array.from(
        { length: 1001 },
        (_, i) => `N${i};3330${String(i).padStart(6, "0")}`,
      ).join("\n");
    expect(parseClientsCsv(big)).toEqual({ ok: false, error: "too_many_rows" });
  });
});

describe("cleanClientRows", () => {
  it("10 righe con 2 duplicati e 1 senza cellulare: 7 valide e 3 scartate con motivo", () => {
    const csv = [
      "nome;cognome;cellulare;email",
      "Anna;Rossi;333 111 0001;ANNA@Example.IT",
      "Bruno;Verdi;+39 333 111 0002;",
      "Carla;Bianchi;0039 333 111 0003;carla@example.it",
      "Dario;Neri;3331110004;",
      "Elisa;Gallo;;elisa@example.it",
      "Franco;Russo;333-111-0005;",
      "Anna;Rossi bis;333 1110001;",
      "Giulia;Costa;333 111 0006;",
      "Carla;Altra;333 999 0000; carla@example.it ",
      "Ivo;Conti;333 111 0007;ivo@example.it",
    ].join("\n");

    const { valid, discarded } = clean(csv);
    expect(valid).toHaveLength(7);
    expect(discarded).toEqual([
      {
        line: 6,
        label: "Elisa Gallo",
        reason: "missing_phone",
        duplicateOfLine: undefined,
      },
      {
        line: 8,
        label: "Anna Rossi bis 333 1110001",
        reason: "duplicate_in_file",
        duplicateOfLine: 2,
      },
      {
        line: 10,
        label: "Carla Altra 333 999 0000",
        reason: "duplicate_in_file",
        duplicateOfLine: 4,
      },
    ]);
    expect(valid[0]).toEqual({
      line: 2,
      firstName: "Anna",
      lastName: "Rossi",
      phone: "+393331110001",
      email: "anna@example.it",
      birthDate: null,
      warnings: [],
    });
  });

  it("normalizza telefoni in formati diversi e toglie spazi superflui", () => {
    const { valid } = clean(
      "nome;cognome;cellulare\n  Maria   Luisa ; De  Santis ;(333) 222.0001\n",
    );
    expect(valid[0]).toMatchObject({
      firstName: "Maria Luisa",
      lastName: "De Santis",
      phone: "+393332220001",
    });
  });

  it("scarta cellulari non validi e righe senza nome", () => {
    const { valid, discarded } = clean(
      "nome;cellulare\nAnna;12345\n;3331234567\n",
    );
    expect(valid).toHaveLength(0);
    expect(discarded.map((d) => d.reason)).toEqual([
      "invalid_phone",
      "missing_name",
    ]);
  });

  it("scarta i clienti già presenti nello studio, per cellulare o email", () => {
    const existing = {
      phones: new Set(["+393331110001"]),
      emails: new Set(["luca@example.it"]),
    };
    const { valid, discarded } = clean(
      "nome;cellulare;email\nAnna;333 111 0001;\nLuca;333 111 0009;LUCA@example.it\nSara;333 111 0010;\n",
      existing,
    );
    expect(valid.map((r) => r.firstName)).toEqual(["Sara"]);
    expect(discarded.map((d) => d.reason)).toEqual([
      "already_in_studio",
      "already_in_studio",
    ]);
  });

  it("importa senza email o data le righe con quei dati non validi, con un avviso", () => {
    const { valid } = clean(
      "nome;cellulare;email;data di nascita\nAnna;3331234567;non-email;31/02/1990\n",
    );
    expect(valid[0]).toMatchObject({
      email: null,
      birthDate: null,
      warnings: ["invalid_email_dropped", "invalid_birth_date_dropped"],
    });
  });
});

describe("parseBirthDate", () => {
  it("accetta i formati italiani e ISO", () => {
    expect(parseBirthDate("12/03/1991", TODAY)).toBe("1991-03-12");
    expect(parseBirthDate("1-2-1980", TODAY)).toBe("1980-02-01");
    expect(parseBirthDate("1991-03-12", TODAY)).toBe("1991-03-12");
  });

  it("rifiuta date inesistenti, future o troppo antiche", () => {
    for (const value of [
      "31/02/1990",
      "01/01/2030",
      "01/01/1850",
      "12/1991",
      "ieri",
    ]) {
      expect(parseBirthDate(value, TODAY)).toBeNull();
    }
  });
});
