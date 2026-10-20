import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  checkinDayParamSchema,
  checkinSchema,
  goalsFormSchema,
  parseGoalInput,
  circumferenceFormSchema,
  entryValuesSchema,
  parseDecimalInput,
  workoutFormSchema,
  type MetricLimits,
} from "./tracking.schema";

const WAIST: MetricLimits = {
  kind: "circumference",
  minValue: 10,
  maxValue: 250,
  unit: "cm",
};
const WORKOUT: MetricLimits = {
  kind: "workout",
  minValue: 1,
  maxValue: 10,
  unit: "voto",
};
const WATER: MetricLimits = {
  kind: "habit",
  minValue: 1,
  maxValue: 5,
  unit: "voto",
};

// 14 ottobre 2026 alle 10 a Roma
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-14T08:00:00Z"));
});
afterEach(() => vi.useRealTimers());

const firstError = (result: {
  success: boolean;
  error?: { issues: { message: string }[] };
}) => result.error?.issues[0]?.message;

describe("parseDecimalInput", () => {
  it("accetta la virgola e il punto", () => {
    expect(parseDecimalInput("76,4")).toBe(76.4);
    expect(parseDecimalInput(" 76.4 ")).toBe(76.4);
    expect(parseDecimalInput("80")).toBe(80);
    expect(parseDecimalInput("76,4cm")).toBeNull();
    expect(parseDecimalInput("-3")).toBeNull();
  });
});

describe("circumferenceFormSchema", () => {
  const schema = circumferenceFormSchema(WAIST);

  it("valore con la virgola e data di oggi", () => {
    expect(schema.parse({ value: "76,4", recordedOn: "2026-10-14" })).toEqual({
      value: 76.4,
      recordedOn: "2026-10-14",
    });
  });

  it("rifiuta i valori fuori dai limiti della misura", () => {
    expect(
      firstError(schema.safeParse({ value: "251", recordedOn: "2026-10-14" })),
    ).toBe("Il valore deve essere tra 10 e 250 cm.");
    expect(
      schema.safeParse({ value: "9,9", recordedOn: "2026-10-14" }).success,
    ).toBe(false);
    expect(
      schema.safeParse({ value: "250", recordedOn: "2026-10-14" }).success,
    ).toBe(true);
  });

  it("rifiuta testo, valori vuoti e più di un decimale", () => {
    expect(
      firstError(schema.safeParse({ value: "", recordedOn: "2026-10-14" })),
    ).toBe("Inserisci un valore.");
    expect(
      firstError(schema.safeParse({ value: "abc", recordedOn: "2026-10-14" })),
    ).toBe("Inserisci un numero, per esempio 76,4.");
    expect(
      firstError(
        schema.safeParse({ value: "76,45", recordedOn: "2026-10-14" }),
      ),
    ).toBe("Usa al massimo un decimale.");
  });

  it("rifiuta una data futura nel fuso di Roma", () => {
    expect(
      firstError(schema.safeParse({ value: "80", recordedOn: "2026-10-15" })),
    ).toBe("La data non può essere futura.");
  });

  it("dopo la mezzanotte di Roma il nuovo giorno è già ammesso", () => {
    vi.setSystemTime(new Date("2026-10-14T22:30:00Z")); // 00:30 del 15 a Roma
    expect(
      schema.safeParse({ value: "80", recordedOn: "2026-10-15" }).success,
    ).toBe(true);
  });
});

describe("workoutFormSchema", () => {
  const schema = workoutFormSchema(WORKOUT);

  it("voto intero da 1 a 10 e nota facoltativa", () => {
    expect(
      schema.parse({ value: 8, recordedOn: "2026-10-14", note: "  " }),
    ).toEqual({ value: 8, recordedOn: "2026-10-14", note: null });
    expect(
      schema.safeParse({ value: 11, recordedOn: "2026-10-14", note: "" })
        .success,
    ).toBe(false);
    expect(
      schema.safeParse({ value: 7.5, recordedOn: "2026-10-14", note: "" })
        .success,
    ).toBe(false);
    expect(
      schema.safeParse({ value: null, recordedOn: "2026-10-14", note: "" })
        .success,
    ).toBe(false);
  });

  it("nota al massimo di 500 caratteri", () => {
    expect(
      schema.safeParse({
        value: 8,
        recordedOn: "2026-10-14",
        note: "x".repeat(501),
      }).success,
    ).toBe(false);
  });
});

describe("entryValuesSchema", () => {
  it("normalizza i valori per tipo di misura", () => {
    expect(
      entryValuesSchema(WAIST).parse({
        value: "80,5",
        recordedOn: "2026-10-01",
      }),
    ).toEqual({ value: 80.5, recordedOn: "2026-10-01", note: null });
    expect(
      entryValuesSchema(WATER).parse({ value: 4, recordedOn: "x" }),
    ).toEqual({
      value: 4,
      note: null,
    });
    expect(entryValuesSchema(WATER).safeParse({ value: 6 }).success).toBe(
      false,
    );
  });
});

describe("checkinSchema", () => {
  it("accetta da uno a tre voti da 1 a 5", () => {
    expect(
      checkinSchema.safeParse({ day: "today", values: { water: 3 } }).success,
    ).toBe(true);
    expect(
      checkinSchema.safeParse({
        day: "yesterday",
        values: { steps: 4, sleep: 5, water: 3 },
      }).success,
    ).toBe(true);
  });

  it("rifiuta un check-in vuoto, voti fuori scala e altri giorni", () => {
    expect(
      firstError(checkinSchema.safeParse({ day: "today", values: {} })),
    ).toBe("Scegli almeno un voto.");
    expect(
      checkinSchema.safeParse({ day: "today", values: { water: 6 } }).success,
    ).toBe(false);
    expect(
      checkinSchema.safeParse({ day: "2026-10-10", values: { water: 3 } })
        .success,
    ).toBe(false);
  });
});

describe("checkinDayParamSchema", () => {
  it("'ieri' sceglie ieri, qualsiasi altro valore oggi", () => {
    expect(checkinDayParamSchema.parse("ieri")).toBe("yesterday");
    expect(checkinDayParamSchema.parse(undefined)).toBe("today");
    expect(checkinDayParamSchema.parse(["ieri", "x"])).toBe("today");
  });
});

describe("goalValueSchema e goalsFormSchema", () => {
  it("acqua in litri con la virgola, entro 0,5–6 e al decimo", () => {
    expect(goalsFormSchema.parse({ water: "2,5" })).toEqual({ water: 2.5 });
    expect(goalsFormSchema.safeParse({ water: "7" }).success).toBe(false);
    expect(goalsFormSchema.safeParse({ water: "2,55" }).success).toBe(false);
  });

  it("passi interi, con o senza il punto delle migliaia", () => {
    expect(goalsFormSchema.parse({ steps: "8.000" })).toEqual({ steps: 8000 });
    expect(goalsFormSchema.parse({ steps: "10000" })).toEqual({ steps: 10000 });
    expect(goalsFormSchema.safeParse({ steps: "500" }).success).toBe(false);
    expect(goalsFormSchema.safeParse({ steps: "8,5" }).success).toBe(false);
  });

  it("sonno in ore e mezze ore, entro 4–12", () => {
    expect(goalsFormSchema.parse({ sleep: "7,5" })).toEqual({ sleep: 7.5 });
    const result = goalsFormSchema.safeParse({ sleep: "7,25" });
    expect(firstError(result)).toBe("Usa multipli di 0,5.");
    expect(firstError(goalsFormSchema.safeParse({ sleep: "13" }))).toBe(
      "L'obiettivo deve essere tra 4 e 12.",
    );
  });

  it("parseGoalInput", () => {
    expect(parseGoalInput("steps", "12.500")).toBe(12500);
    expect(parseGoalInput("steps", "12.5")).toBeNull();
    expect(parseGoalInput("water", "1.5")).toBe(1.5);
  });
});
