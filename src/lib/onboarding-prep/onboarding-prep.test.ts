import { describe, expect, it } from "vitest";

import {
  getReminderPlan,
  prepDeadline,
  prepReminderKind,
  prepReminderWindow,
} from "./reminders";
import { getPrepStatus } from "./status";
import { callWhenText, deadlineText } from "./labels";
import { prepMeasuresFormSchema } from "@/server/validation/onboarding-prep.schema";

const base = {
  measuresDone: 0,
  measuresTotal: 7,
  photosStatus: null,
  photosCount: 0,
} as const;

describe("getPrepStatus", () => {
  it("nulla inviato: 0 di 2, mancano misure e foto", () => {
    expect(getPrepStatus(base)).toEqual({
      measures: "todo",
      photos: "todo",
      done: 0,
      complete: false,
      missing: ["measures", "photos"],
    });
  });
  it("solo misure: 1 di 2, mancano le foto", () => {
    expect(getPrepStatus({ ...base, measuresDone: 7 })).toMatchObject({
      measures: "done",
      done: 1,
      missing: ["photos"],
    });
  });
  it("misure incomplete: ancora da fare", () => {
    expect(getPrepStatus({ ...base, measuresDone: 6 }).measures).toBe("todo");
  });
  it("foto in bozza: non conta come fatto", () => {
    expect(
      getPrepStatus({ ...base, photosStatus: "draft", photosCount: 2 }),
    ).toMatchObject({
      photos: "draft",
      done: 0,
      missing: ["measures", "photos"],
    });
  });
  it("solo foto salvate: 1 di 2, mancano le misure", () => {
    expect(
      getPrepStatus({ ...base, photosStatus: "saved", photosCount: 3 }),
    ).toMatchObject({ photos: "saved", done: 1, missing: ["measures"] });
  });
  it("tutto inviato", () => {
    expect(
      getPrepStatus({
        measuresDone: 7,
        measuresTotal: 7,
        photosStatus: "saved",
        photosCount: 3,
      }),
    ).toMatchObject({ done: 2, complete: true, missing: [] });
  });
  it("uno studio senza misure mensili non dà le misure per fatte", () => {
    expect(getPrepStatus({ ...base, measuresTotal: 0 }).measures).toBe("todo");
  });
});

describe("promemoria", () => {
  const incomplete = { complete: false };
  it("2 giorni e 1 giorno prima alle 18", () => {
    expect(getReminderPlan("2026-10-15", incomplete)).toEqual([
      { kind: "prep_2d", day: "2026-10-13", hour: 18 },
      { kind: "prep_1d", day: "2026-10-14", hour: 18 },
    ]);
  });
  it("nessuno con tutto inviato o senza data della chiamata", () => {
    expect(getReminderPlan("2026-10-15", { complete: true })).toEqual([]);
    expect(getReminderPlan(null, incomplete)).toEqual([]);
  });
  it("turno del cron: alle 18 le chiamate fra 1 e 2 giorni", () => {
    expect(prepReminderWindow({ day: "2026-10-13", hour: 18 })).toEqual({
      from: "2026-10-14",
      to: "2026-10-15",
    });
    expect(prepReminderWindow({ day: "2026-10-13", hour: 8 })).toBeNull();
    expect(prepReminderKind("2026-10-15", "2026-10-13")).toBe("prep_2d");
    expect(prepReminderKind("2026-10-14", "2026-10-13")).toBe("prep_1d");
    expect(prepReminderKind("2026-10-20", "2026-10-13")).toBeNull();
  });
  it("scadenza: il giorno prima della chiamata", () => {
    expect(prepDeadline("2026-10-15")).toBe("2026-10-14");
    expect(deadlineText("2026-10-15")).toBe("mercoledì 14 ottobre");
  });
  it("data della chiamata nei testi", () => {
    expect(callWhenText("2026-10-15", "18:00")).toBe(
      "Giovedì 15 ottobre, ore 18:00",
    );
    expect(callWhenText("2026-10-15", null)).toBe("Giovedì 15 ottobre");
  });
});

describe("validazione delle misure di partenza", () => {
  const schema = prepMeasuresFormSchema([
    {
      key: "circ_waist",
      limits: {
        kind: "circumference",
        minValue: 10,
        maxValue: 250,
        unit: "cm",
      },
    },
    {
      key: "circ_right_leg",
      limits: {
        kind: "circumference",
        minValue: 10,
        maxValue: 150,
        unit: "cm",
      },
    },
  ]);
  const ok = {
    recordedOn: "2026-01-10",
    values: { circ_waist: "84,0", circ_right_leg: "58" },
  };

  it("accetta virgola e punto", () => {
    expect(schema.parse(ok).values).toEqual({
      circ_waist: 84,
      circ_right_leg: 58,
    });
  });
  it("valore fuori dai limiti: l'errore dice i valori ammessi", () => {
    const result = schema.safeParse({
      ...ok,
      values: { ...ok.values, circ_right_leg: "5" },
    });
    expect(result.error?.issues[0]?.path).toEqual(["values", "circ_right_leg"]);
    expect(result.error?.issues[0]?.message).toMatch(/10.*150/);
  });
  it("ogni misura è obbligatoria", () => {
    expect(
      schema.safeParse({ ...ok, values: { circ_waist: "84" } }).success,
    ).toBe(false);
  });
  it("data futura rifiutata", () => {
    expect(schema.safeParse({ ...ok, recordedOn: "2999-01-01" }).success).toBe(
      false,
    );
  });
});
