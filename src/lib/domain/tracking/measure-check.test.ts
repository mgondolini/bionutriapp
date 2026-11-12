import { describe, expect, it } from "vitest";

import { circumferenceSchedule } from "./circumferences";
import { measureCheck, measureCheckReminder } from "./measure-check";

const NONE = {
  override: null,
  overrideSetAt: null,
  lastRecordedOn: null,
  lastCreatedAt: null,
};

describe("measureCheck", () => {
  it("senza registrazioni e senza data scelta non c'è un check", () => {
    expect(measureCheck(NONE)).toEqual({
      dueOn: null,
      source: "none",
      defaultDueOn: null,
    });
  });

  it("predefinito: ultima registrazione mensile + 30 giorni", () => {
    expect(
      measureCheck({
        ...NONE,
        lastRecordedOn: "2026-11-01",
        lastCreatedAt: "2026-11-01T08:00:00Z",
      }),
    ).toEqual({
      dueOn: "2026-12-01",
      source: "default",
      defaultDueOn: "2026-12-01",
    });
  });

  it("la data del nutrizionista vale finché non arriva una nuova registrazione", () => {
    const base = {
      override: "2026-12-15",
      overrideSetAt: "2026-11-10T09:00:00Z",
      lastRecordedOn: "2026-11-01",
      lastCreatedAt: "2026-11-01T08:00:00Z",
    };
    expect(measureCheck(base)).toEqual({
      dueOn: "2026-12-15",
      source: "staff",
      defaultDueOn: "2026-12-01",
    });
    // registrazione dopo la scelta: si riparte da registrazione + 30
    expect(
      measureCheck({
        ...base,
        lastRecordedOn: "2026-12-14",
        lastCreatedAt: "2026-12-14T07:00:00Z",
      }),
    ).toEqual({
      dueOn: "2027-01-13",
      source: "default",
      defaultDueOn: "2027-01-13",
    });
  });

  it("la data del nutrizionista vale anche prima della prima registrazione", () => {
    expect(
      measureCheck({
        ...NONE,
        override: "2026-11-20",
        overrideSetAt: "2026-11-10T09:00:00Z",
      }).dueOn,
    ).toBe("2026-11-20");
  });
});

describe("measureCheckReminder", () => {
  it("il giorno prima e il giorno stesso, mai altrimenti", () => {
    expect(measureCheckReminder("2026-12-01", "2026-11-30")).toBe("eve");
    expect(measureCheckReminder("2026-12-01", "2026-12-01")).toBe("day");
    expect(measureCheckReminder("2026-12-01", "2026-11-29")).toBeNull();
    expect(measureCheckReminder("2026-12-01", "2026-12-02")).toBeNull();
    expect(measureCheckReminder(null, "2026-12-01")).toBeNull();
  });
});

describe("circumferenceSchedule con la data del nutrizionista", () => {
  it("la data scelta sostituisce ultima + 30 per ogni misura registrata", () => {
    // registrata 40 giorni fa: senza data scelta sarebbe in ritardo
    expect(circumferenceSchedule("2026-10-01", "2026-11-10").status).toBe(
      "overdue",
    );
    expect(
      circumferenceSchedule("2026-10-01", "2026-11-10", "2026-11-20"),
    ).toEqual({
      status: "ok",
      dueOn: "2026-11-20",
      daysSince: 40,
      daysLeft: 10,
    });
    expect(
      circumferenceSchedule("2026-10-01", "2026-11-10", "2026-11-12").status,
    ).toBe("due_soon");
    // mai registrata resta "Da registrare"
    expect(circumferenceSchedule(null, "2026-11-10", "2026-11-20").status).toBe(
      "never",
    );
  });
});
