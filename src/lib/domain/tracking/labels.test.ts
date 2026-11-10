import { describe, expect, it } from "vitest";

import {
  entryAuthorBadge,
  habitDeltaText,
  measureText,
  relativeDayText,
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

describe("entryAuthorBadge", () => {
  it("registrazione inserita dallo staff, modificata o no", () => {
    expect(
      entryAuthorBadge({ createdByRole: "staff", updatedByRole: "staff" }),
    ).toBe("staff_created");
  });

  it("registrazione del cliente modificata per ultimo dallo staff", () => {
    expect(
      entryAuthorBadge({ createdByRole: "client", updatedByRole: "staff" }),
    ).toBe("staff_edited");
  });

  it("registrazione del cliente, nessuna etichetta", () => {
    expect(
      entryAuthorBadge({ createdByRole: "client", updatedByRole: "client" }),
    ).toBeNull();
  });
});

describe("relativeDayText", () => {
  it("oggi, ieri e i giorni passati", () => {
    expect(relativeDayText("2026-11-10", "2026-11-10")).toBe("oggi");
    expect(relativeDayText("2026-11-09", "2026-11-10")).toBe("ieri");
    expect(relativeDayText("2026-11-07", "2026-11-10")).toBe("3 giorni fa");
    // attraverso il cambio dell'ora legale i giorni restano interi
    expect(relativeDayText("2026-10-24", "2026-10-26")).toBe("2 giorni fa");
  });
});
