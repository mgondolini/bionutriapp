import { describe, expect, it } from "vitest";

import { circumferenceSchedule } from "./circumferences";
import {
  journeyCheckDates,
  journeyDueOn,
  measureCheck,
  measureCheckReminder,
} from "./measure-check";

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
  it("3, 2 e 1 giorno prima e il giorno stesso, mai altrimenti", () => {
    expect(measureCheckReminder("2026-12-01", "2026-11-27")).toBeNull();
    expect(measureCheckReminder("2026-12-01", "2026-11-28")).toBe("d3");
    expect(measureCheckReminder("2026-12-01", "2026-11-29")).toBe("d2");
    expect(measureCheckReminder("2026-12-01", "2026-11-30")).toBe("eve");
    expect(measureCheckReminder("2026-12-01", "2026-12-01")).toBe("day");
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

describe("promemoria e home allineati", () => {
  it("nei giorni del promemoria le misure sono già in scadenza nella home", () => {
    // check scelto dal nutrizionista il 1° dicembre
    for (const today of [
      "2026-11-28",
      "2026-11-29",
      "2026-11-30",
      "2026-12-01",
    ]) {
      expect(measureCheckReminder("2026-12-01", today)).not.toBeNull();
      expect(
        circumferenceSchedule("2026-11-05", today, "2026-12-01").status,
      ).toBe("due_soon");
    }
    // il giorno prima del primo promemoria non compaiono ancora
    expect(
      circumferenceSchedule("2026-11-05", "2026-11-27", "2026-12-01").status,
    ).toBe("ok");
  });
});

describe("check delle misure dal percorso", () => {
  it("solo i check (anche omaggio) da fare, in ordine di data", () => {
    expect(
      journeyCheckDates([
        { type: "check", status: "todo", date: "2026-12-16" },
        { type: "onboarding", status: "todo", date: "2026-10-10" },
        { type: "check", status: "done", date: "2026-10-16" },
        { type: "check", status: "skipped", date: "2026-11-01" },
        { type: "gift", status: "todo", date: "2026-11-16" },
      ]),
    ).toEqual(["2026-11-16", "2026-12-16"]);
  });

  it("una misura presa da 3 giorni prima vale per quel check", () => {
    const checks = ["2026-11-16", "2026-12-16"];
    expect(journeyDueOn(checks, null)).toBe("2026-11-16");
    expect(journeyDueOn(checks, "2026-11-12")).toBe("2026-11-16");
    expect(journeyDueOn(checks, "2026-11-13")).toBe("2026-12-16");
    expect(journeyDueOn(checks, "2026-12-20")).toBeNull();
  });

  it("il percorso vale più della data scelta e dei 30 giorni", () => {
    const base = {
      override: "2026-12-01",
      overrideSetAt: "2026-11-01T10:00:00Z",
      lastRecordedOn: "2026-10-30",
      lastCreatedAt: "2026-10-30T10:00:00Z",
    };
    expect(measureCheck({ ...base, journeyChecks: ["2026-11-16"] })).toEqual({
      dueOn: "2026-11-16",
      source: "journey",
      defaultDueOn: "2026-11-29",
    });
    // dopo l'ultimo check del percorso tornano le regole di prima
    expect(measureCheck({ ...base, journeyChecks: [] }).source).toBe("staff");
  });
});
