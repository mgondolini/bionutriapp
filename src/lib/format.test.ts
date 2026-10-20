import { describe, expect, it } from "vitest";

import {
  formatDayMonthShort,
  formatDecimal,
  formatNumber,
  formatSignedDelta,
  formatWeekdayLong,
  formatWeekdayShort,
} from "./format";

describe("formattazione dei numeri", () => {
  it("decimali con la virgola e il segno meno tipografico", () => {
    expect(formatDecimal(77)).toBe("77,0");
    expect(formatDecimal(-1.45)).toBe("−1,5");
    expect(formatNumber(8000)).toBe("8.000");
    expect(formatNumber(2.5)).toBe("2,5");
  });

  it("differenze con segno e unità", () => {
    expect(formatSignedDelta(-1.5, "cm")).toBe("−1,5 cm");
    expect(formatSignedDelta(0.6)).toBe("+0,6");
    expect(formatSignedDelta(0, "cm")).toBe("0,0 cm");
    expect(formatSignedDelta(-0.04, "cm")).toBe("0,0 cm");
  });
});

describe("formattazione delle date brevi", () => {
  it("giorno e mese, giorno della settimana", () => {
    expect(formatDayMonthShort("2026-09-08")).toBe("8 set");
    expect(formatWeekdayShort("2026-10-13")).toBe("Mar");
    expect(formatWeekdayLong("2026-10-13")).toBe("Martedì");
  });
});
