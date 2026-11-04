import { describe, expect, it } from "vitest";

import {
  contrastRatio,
  formatRatio,
  normalizeHexColor,
  pickForeground,
  inkColor,
  mintColor,
  themeVariables,
  tintColor,
} from "./color";

const BRAND_SAMPLES = [
  "#1F7A5C",
  "#2E6A4E",
  "#1F2A44",
  "#F2C94C",
  "#7A3E8E",
  "#FF0000",
  "#0000FF",
  "#00FF00",
  "#808080",
  "#FFFFFF",
  "#000000",
];
const DEEP = "#1F3A34";
const SIDEBAR_ACTIVE = "#3A524C";

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
  it("usa il testo bianco sull'Azione predefinita (5,25:1 come nel mockup v2)", () => {
    const choice = pickForeground("#1F7A5C");
    expect(choice.tone).toBe("light");
    expect(choice.color).toBe("#FFFFFF");
    expect(formatRatio(choice.ratio)).toBe("5,3");
    expect(choice.meetsAA).toBe(true);
  });

  it("usa il testo scuro su un primario chiaro", () => {
    const choice = pickForeground("#F2C94C");
    expect(choice.tone).toBe("dark");
    expect(choice.color).toBe("#1F3A34");
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
  it("usa il fallback #1F7A5C per valori non validi", () => {
    expect(normalizeHexColor(null)).toBe("#1F7A5C");
    expect(normalizeHexColor("red")).toBe("#1F7A5C");
    expect(normalizeHexColor("#abcdef")).toBe("#ABCDEF");
  });

  it("sovrascrive primario e testo sopra il primario", () => {
    expect(themeVariables("#f2c94c")).toMatchObject({
      "--primary": "#F2C94C",
      "--primary-foreground": "#1F3A34",
    });
    expect(themeVariables(undefined)["--primary"]).toBe("#1F7A5C");
  });
});

describe("inkColor", () => {
  it("lascia invariato un colore già leggibile su sfondo chiaro", () => {
    expect(inkColor("#1F5C86")).toBe("#1F5C86");
    expect(inkColor("#1F2A44")).toBe("#1F2A44");
  });

  it("scurisce un colore chiaro fino al contrasto AA con sfondo e pillole", () => {
    const ink = inkColor("#F2C94C");
    expect(ink).not.toBe("#F2C94C");
    expect(contrastRatio(ink, "#EDF3EF")).toBeGreaterThanOrEqual(4.5);
    expect(themeVariables("#F2C94C")["--primary-ink"]).toBe(ink);
    expect(themeVariables("#F2C94C")["--ring"]).toBe(ink);
  });

  it("anche il bianco diventa un colore leggibile", () => {
    expect(
      contrastRatio(inkColor("#FFFFFF"), "#EDF3EF"),
    ).toBeGreaterThanOrEqual(4.5);
  });
});

describe("inkColor sulla tinta", () => {
  it("resta leggibile sullo sfondo e sulla tinta di qualsiasi studio", () => {
    for (const color of BRAND_SAMPLES) {
      const ink = inkColor(color);
      expect(contrastRatio(ink, "#EDF3EF")).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(ink, tintColor(color))).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("mintColor e tintColor", () => {
  it("ricava dal verde predefinito i colori del mockup v2", () => {
    // #98E2C6 e #CFEFE2 nel mockup: stessa tinta, scarto minimo
    expect(contrastRatio(mintColor("#1F7A5C"), "#98E2C6")).toBeLessThan(1.1);
    expect(contrastRatio(tintColor("#1F7A5C"), "#CFEFE2")).toBeLessThan(1.1);
  });

  it("garantisce il contrasto AA del testo Profondo sulla menta e del menu laterale", () => {
    for (const color of BRAND_SAMPLES) {
      expect(contrastRatio(mintColor(color), DEEP)).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(mintColor(color), SIDEBAR_ACTIVE),
      ).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(tintColor(color), DEEP)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("un colore senza saturazione dà un grigio", () => {
    const mint = mintColor("#808080");
    expect(mint.slice(1, 3)).toBe(mint.slice(3, 5));
    expect(mint.slice(3, 5)).toBe(mint.slice(5, 7));
  });

  it("entrano nelle variabili del tema", () => {
    expect(themeVariables("#7A3E8E")).toMatchObject({
      "--mint": mintColor("#7A3E8E"),
      "--primary-tint": tintColor("#7A3E8E"),
    });
  });
});
