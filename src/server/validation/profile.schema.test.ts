import { describe, expect, it } from "vitest";

import { CLIENT_EDITABLE_FIELDS } from "@/lib/constants/domain";

import {
  changePasswordSchema,
  clientProfileSchema,
  emailChangeSchema,
  staffProfileSchema,
  toClientProfileUpdate,
} from "./profile.schema";

describe("profilo del cliente", () => {
  it("normalizza i campi e accetta la data del campo date", () => {
    const parsed = clientProfileSchema.parse({
      firstName: "  Giulia ",
      lastName: "Bianchi",
      birthDate: "1991-03-12",
      heightCm: "165",
    });
    expect(parsed).toEqual({
      firstName: "Giulia",
      lastName: "Bianchi",
      birthDate: "1991-03-12",
      heightCm: 165,
    });
  });

  it("data di nascita facoltativa, ma reale e non futura", () => {
    const base = { firstName: "Giulia", lastName: "Bianchi", heightCm: "165" };
    expect(
      clientProfileSchema.parse({ ...base, birthDate: "" }).birthDate,
    ).toBe(null);
    expect(
      clientProfileSchema.safeParse({ ...base, birthDate: "2026-02-30" })
        .success,
    ).toBe(false);
    expect(
      clientProfileSchema.safeParse({ ...base, birthDate: "2999-01-01" })
        .success,
    ).toBe(false);
  });

  it("nome e cognome obbligatori, al massimo 80 caratteri", () => {
    expect(
      clientProfileSchema.safeParse({
        firstName: " ",
        lastName: "B",
        birthDate: "",
        heightCm: "165",
      }).success,
    ).toBe(false);
    expect(
      clientProfileSchema.safeParse({
        firstName: "G",
        lastName: "x".repeat(81),
        birthDate: "",
        heightCm: "165",
      }).success,
    ).toBe(false);
  });

  it("ignora i campi non previsti (cellulare, stato, fase, studio)", () => {
    const parsed = clientProfileSchema.parse({
      firstName: "Giulia",
      lastName: "Bianchi",
      birthDate: "",
      heightCm: "165",
      phone: "+393330000000",
      account_status: "disabled",
      journey_stage: "completed",
      studio_id: "x",
    });
    expect(Object.keys(parsed).sort()).toEqual([
      "birthDate",
      "firstName",
      "heightCm",
      "lastName",
    ]);
  });

  it("altezza obbligatoria, in centimetri interi", () => {
    const base = { firstName: "Giulia", lastName: "Bianchi", birthDate: "" };
    expect(
      clientProfileSchema.safeParse({ ...base, heightCm: "" }).success,
    ).toBe(false);
    expect(
      clientProfileSchema.safeParse({ ...base, heightCm: "1,65" }).success,
    ).toBe(false);
  });

  it("l'aggiornamento contiene solo le colonne modificabili dal cliente", () => {
    const update = toClientProfileUpdate({
      firstName: "Giulia",
      lastName: "Bianchi",
      birthDate: null,
      heightCm: 165,
    });
    expect(Object.keys(update)).toEqual([...CLIENT_EDITABLE_FIELDS]);
    expect(CLIENT_EDITABLE_FIELDS).toEqual([
      "first_name",
      "last_name",
      "birth_date",
      "height_cm",
    ]);
  });
});

describe("profilo del professionista", () => {
  it("titolo e cognome facoltativi", () => {
    expect(
      staffProfileSchema.parse({
        title: " ",
        firstName: "Elena",
        lastName: "",
      }),
    ).toEqual({ title: null, firstName: "Elena", lastName: null });
  });

  it("titolo al massimo 20 caratteri", () => {
    expect(
      staffProfileSchema.safeParse({
        title: "x".repeat(21),
        firstName: "Elena",
        lastName: "",
      }).success,
    ).toBe(false);
  });
});

describe("cambio email", () => {
  it("indirizzo valido, in minuscolo", () => {
    expect(emailChangeSchema.parse({ email: " Giulia@Esempio.IT " })).toEqual({
      email: "giulia@esempio.it",
    });
    expect(emailChangeSchema.safeParse({ email: "giulia" }).success).toBe(
      false,
    );
  });
});

describe("cambio password", () => {
  const valid = {
    currentPassword: "vecchia-password",
    password: "nuova-password",
    confirm: "nuova-password",
  };

  it("accetta una nuova password valida e confermata", () => {
    expect(changePasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("rifiuta conferma diversa, password corta, troppo lunga o uguale all'attuale", () => {
    const cases = [
      { ...valid, confirm: "altra-password" },
      { ...valid, password: "corta", confirm: "corta" },
      { ...valid, password: "x".repeat(73), confirm: "x".repeat(73) },
      {
        ...valid,
        password: valid.currentPassword,
        confirm: valid.currentPassword,
      },
      { ...valid, currentPassword: "" },
    ];
    for (const input of cases) {
      expect(changePasswordSchema.safeParse(input).success).toBe(false);
    }
  });
});
