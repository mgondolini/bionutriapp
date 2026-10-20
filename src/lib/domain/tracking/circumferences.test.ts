import { describe, expect, it } from "vitest";

import {
  circumferenceSchedule,
  circumferenceSummary,
  isRecordedInPeriod,
  measureHistory,
} from "./circumferences";

const TODAY = "2026-10-14";
const entry = (id: string, value: number, recordedOn: string) => ({
  id,
  value,
  recordedOn,
});

describe("circumferenceSchedule", () => {
  it("in ritardo con più di 30 giorni dall'ultima registrazione", () => {
    const schedule = circumferenceSchedule("2026-09-08", TODAY);
    expect(schedule).toEqual({
      status: "overdue",
      dueOn: "2026-10-08",
      daysSince: 36,
      daysLeft: -6,
    });
    expect(isRecordedInPeriod(schedule)).toBe(false);
  });

  it("esattamente 30 giorni: ancora nel periodo, in scadenza oggi", () => {
    const schedule = circumferenceSchedule("2026-09-14", TODAY);
    expect(schedule.status).toBe("due_soon");
    expect(schedule.daysLeft).toBe(0);
    expect(isRecordedInPeriod(schedule)).toBe(true);
  });

  it("31 giorni: in ritardo", () => {
    expect(circumferenceSchedule("2026-09-13", TODAY).status).toBe("overdue");
  });

  it("in scadenza quando mancano al massimo 3 giorni", () => {
    expect(circumferenceSchedule("2026-09-17", TODAY).status).toBe("due_soon"); // 3 giorni
    expect(circumferenceSchedule("2026-09-18", TODAY).status).toBe("ok"); // 4 giorni
  });

  it("registrata oggi: in regola, prossima tra 30 giorni", () => {
    const schedule = circumferenceSchedule(TODAY, TODAY);
    expect(schedule.status).toBe("ok");
    expect(schedule.dueOn).toBe("2026-11-13");
    expect(isRecordedInPeriod(schedule)).toBe(true);
  });

  it("mai registrata: né in ritardo né nel periodo", () => {
    const schedule = circumferenceSchedule(null, TODAY);
    expect(schedule).toEqual({
      status: "never",
      dueOn: null,
      daysSince: null,
      daysLeft: null,
    });
    expect(isRecordedInPeriod(schedule)).toBe(false);
  });

  it("i giorni si contano nel calendario, anche attraverso il cambio dell'ora", () => {
    // 25 ottobre 2026: fine dell'ora legale
    expect(circumferenceSchedule("2026-09-26", "2026-10-26").daysSince).toBe(
      30,
    );
  });
});

describe("measureHistory", () => {
  it("aggiunge la variazione rispetto alla registrazione precedente", () => {
    const history = measureHistory([
      entry("c", 77, "2026-09-08"),
      entry("b", 78.4, "2026-08-12"),
      entry("a", 79, "2026-07-13"),
    ]);
    expect(history.map((row) => row.delta)).toEqual([-1.4, -0.6, null]);
  });
});

describe("circumferenceSummary", () => {
  it("ultimo valore, variazione dalla precedente e dall'inizio", () => {
    const summary = circumferenceSummary(
      [
        entry("c", 77, "2026-09-08"),
        entry("b", 78.4, "2026-08-12"),
        entry("a", 82, "2026-04-14"),
      ],
      TODAY,
    );
    expect(summary.last?.id).toBe("c");
    expect(summary.previous?.id).toBe("b");
    expect(summary.first?.id).toBe("a");
    expect(summary.delta).toBe(-1.4);
    expect(summary.deltaFromStart).toBe(-5);
    expect(summary.schedule.status).toBe("overdue");
  });

  it("con un solo valore non ci sono variazioni", () => {
    const summary = circumferenceSummary([entry("a", 80, "2026-10-10")], TODAY);
    expect(summary.delta).toBeNull();
    expect(summary.deltaFromStart).toBeNull();
    expect(summary.first).toBeNull();
  });

  it("senza valori: mai registrata", () => {
    const summary = circumferenceSummary([], TODAY);
    expect(summary.last).toBeNull();
    expect(summary.schedule.status).toBe("never");
  });

  it("variazione positiva", () => {
    const summary = circumferenceSummary(
      [entry("b", 98.5, "2026-10-10"), entry("a", 97, "2026-09-10")],
      TODAY,
    );
    expect(summary.delta).toBe(1.5);
  });
});
