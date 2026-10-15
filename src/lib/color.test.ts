import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  formatRatio,
  normalizeHexColor,
  pickForeground,
  themeVariables,
} from "./color";

describe("contrastRatio", () => {
  it("restituisce i valori WCAG noti", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
    // ordine dei colori indifferente
    expect(contrastRatio("#2E6A4E", "#FFFFFF")).toBeCloseTo(
      contrastRatio("#FFFFFF", "#2E6A4E"),
      10,
    );
  });
});

describe("pickForeground", () => {
  it("usa il testo bianco sul verde predefinito (6,4:1 come nel mockup A12)", () => {
    const choice = pickForeground("#2E6A4E");
    expect(choice.tone).toBe("light");
    expect(choice.color).toBe("#FFFFFF");
    expect(formatRatio(choice.ratio)).toBe("6,4");
    expect(choice.meetsAA).toBe(true);
  });

  it("usa il testo scuro su un primario chiaro", () => {
    const choice = pickForeground("#F2C94C");
    expect(choice.tone).toBe("dark");
    expect(choice.color).toBe("#18211D");
    expect(choice.meetsAA).toBe(true);
  });

  it("rispetta WCAG AA per tutti i colori di prova", () => {
    for (const color of [
      "#000000",
      "#FFFFFF",
      "#1F4E80",
      "#8A4513",
      "#E2ECF7",
      "#00FF00",
      "#0000FF",
    ]) {
      const choice = pickForeground(color);
      expect(choice.ratio).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(color, choice.color)).toBeCloseTo(choice.ratio, 10);
    }
  });

  it("segnala i colori per cui nessun testo raggiunge 4,5:1", () => {
    for (const color of ["#808080", "#FF0000"]) {
      const choice = pickForeground(color);
      expect(choice.ratio).toBeLessThan(4.5);
      expect(choice.meetsAA).toBe(false);
    }
  });
});

describe("normalizeHexColor e themeVariables", () => {
  it("usa il fallback #2E6A4E per valori non validi", () => {
    expect(normalizeHexColor(null)).toBe("#2E6A4E");
    expect(normalizeHexColor("red")).toBe("#2E6A4E");
    expect(normalizeHexColor("#abcdef")).toBe("#ABCDEF");
  });

  it("sovrascrive primario e testo sopra il primario", () => {
    expect(themeVariables("#f2c94c")).toMatchObject({
      "--primary": "#F2C94C",
      "--primary-foreground": "#18211D",
    });
    expect(themeVariables(undefined)["--primary"]).toBe("#2E6A4E");
  });
});
