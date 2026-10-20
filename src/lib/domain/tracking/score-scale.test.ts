import { describe, expect, it } from "vitest";

import { formatGoalAmount, habitScale, roundToStep } from "./score-scale";

const amounts = (key: string, goal: number, unit: string) =>
  habitScale(key, goal, unit).map((row) => `${row.score} ${row.amount}`);

describe("habitScale", () => {
  it("acqua con obiettivo 2 L: coincide con la tabella dei requisiti", () => {
    expect(amounts("water", 2, "L")).toEqual([
      "5 2 L o più",
      "4 circa 1,5 L",
      "3 circa 1 L",
      "2 circa 0,5 L",
      "1 meno di 0,5 L",
    ]);
  });

  it("significati dei voti", () => {
    expect(habitScale("water", 2, "L").map((row) => row.meaning)).toEqual([
      "Obiettivo raggiunto",
      "Quasi raggiunto",
      "A metà",
      "Poco",
      "Quasi niente",
    ]);
  });

  it("acqua con obiettivo personale 2,5 L: arrotondata a mezzo litro", () => {
    expect(amounts("water", 2.5, "L")).toEqual([
      "5 2,5 L o più",
      "4 circa 2 L",
      "3 circa 1,5 L",
      "2 circa 0,5 L",
      "1 meno di 0,5 L",
    ]);
  });

  it("passi arrotondati a 500, con il separatore delle migliaia", () => {
    expect(amounts("steps", 8000, "passi")).toEqual([
      "5 8.000 passi o più",
      "4 circa 6.000 passi",
      "3 circa 4.000 passi",
      "2 circa 2.000 passi",
      "1 meno di 2.000 passi",
    ]);
    expect(amounts("steps", 10000, "passi")[1]).toBe("4 circa 7.500 passi");
  });

  it("sonno arrotondato alla mezz'ora", () => {
    expect(amounts("sleep", 7, "ore")).toEqual([
      "5 7 ore o più",
      "4 circa 5 ore e mezza",
      "3 circa 3 ore e mezza",
      "2 circa 2 ore",
      "1 meno di 2 ore",
    ]);
  });

  it("una misura senza arrotondamento proprio usa un decimale", () => {
    expect(amounts("fruit", 3, "porzioni")[1]).toBe("4 circa 2,3 porzioni");
  });
});

describe("roundToStep", () => {
  it("arrotonda al multiplo più vicino e non restituisce mai zero", () => {
    expect(roundToStep(1.875, 0.5)).toBe(2);
    expect(roundToStep(5.25, 0.5)).toBe(5.5);
    expect(roundToStep(0.1, 0.5)).toBe(0.5);
    expect(roundToStep(2.25, 0.1)).toBe(2.3);
  });
});

describe("formatGoalAmount", () => {
  it("ore al singolare, mezz'ora e mezze ore", () => {
    expect(formatGoalAmount(1, "ore")).toBe("1 ora");
    expect(formatGoalAmount(0.5, "ore")).toBe("mezz'ora");
    expect(formatGoalAmount(7.5, "ore")).toBe("7 ore e mezza");
    expect(formatGoalAmount(1.5, "ore")).toBe("1 ora e mezza");
  });
});
