import { describe, expect, it } from "vitest";

import {
  habitDeltaText,
  measureText,
  scoreText,
  weekRangeText,
} from "./labels";

describe("labels", () => {
  it("valori con unità e un decimale, con la virgola", () => {
    expect(measureText(77, "cm")).toBe("77,0 cm");
    expect(measureText(76.4, "cm")).toBe("76,4 cm");
    expect(scoreText(8, 10)).toBe("8/10");
  });

  it("confronto con la scorsa settimana in formato italiano", () => {
    expect(habitDeltaText(0.6)).toBe("+0,6 rispetto alla scorsa settimana");
    expect(habitDeltaText(-0.3)).toBe("−0,3 rispetto alla scorsa settimana");
    expect(habitDeltaText(0)).toBe("uguale alla scorsa settimana");
    expect(habitDeltaText(null)).toBeNull();
    expect(habitDeltaText(0.8, true)).toBe("+0,8 rispetto alla scorsa");
  });
});

describe("weekRangeText", () => {
  it("stesso mese o due mesi", () => {
    expect(weekRangeText("2026-10-12", "2026-10-18")).toBe("12–18 ott");
    expect(weekRangeText("2026-09-28", "2026-10-04")).toBe("28 set – 4 ott");
  });
});
