import { describe, expect, it } from "vitest";

import { habitWeekSeries, roundOne, weeklyHabitStats } from "./habits";

const day = (recordedOn: string, value: number) => ({ recordedOn, value });

// mercoledì 14 ottobre 2026: settimana corrente 12–18, precedente 5–11
const WEDNESDAY = "2026-10-14";

describe("weeklyHabitStats", () => {
  it("conta i giorni compilati e media solo quelli (i giorni saltati non penalizzano)", () => {
    const stats = weeklyHabitStats(
      [day("2026-10-12", 4), day("2026-10-14", 5)],
      WEDNESDAY,
    );
    expect(stats.weekFrom).toBe("2026-10-12");
    expect(stats.weekTo).toBe("2026-10-18");
    expect(stats.filledDays).toBe(2);
    expect(stats.average).toBe(4.5);
    expect(stats.todayValue).toBe(5);
  });

  it("confronta con la settimana precedente (4,3 contro 3,8 → +0,5)", () => {
    const stats = weeklyHabitStats(
      [
        day("2026-10-12", 4),
        day("2026-10-13", 5),
        day("2026-10-14", 4), // media 4,3
        day("2026-10-05", 4),
        day("2026-10-06", 3),
        day("2026-10-07", 4),
        day("2026-10-11", 4), // media 3,75 → 3,8
      ],
      WEDNESDAY,
    );
    expect(stats.average).toBe(4.3);
    expect(stats.previousAverage).toBe(3.8);
    expect(stats.previousFilledDays).toBe(4);
    expect(stats.delta).toBe(0.5);
  });

  it("la differenza è quella delle medie mostrate (4,5 e 3,7 → 0,8)", () => {
    const stats = weeklyHabitStats(
      [
        day("2026-10-12", 4),
        day("2026-10-13", 5),
        day("2026-10-05", 4),
        day("2026-10-06", 4),
        day("2026-10-07", 3),
      ],
      WEDNESDAY,
    );
    expect(stats.average).toBe(4.5);
    expect(stats.previousAverage).toBe(3.7);
    expect(stats.delta).toBe(0.8);
  });

  it("senza la settimana precedente non c'è confronto", () => {
    const stats = weeklyHabitStats([day("2026-10-13", 3)], WEDNESDAY);
    expect(stats.previousAverage).toBeNull();
    expect(stats.delta).toBeNull();
    expect(stats.average).toBe(3);
  });

  it("settimana corrente vuota: nessuna media e nessun confronto", () => {
    const stats = weeklyHabitStats([day("2026-10-08", 3)], WEDNESDAY);
    expect(stats.filledDays).toBe(0);
    expect(stats.average).toBeNull();
    expect(stats.previousAverage).toBe(3);
    expect(stats.delta).toBeNull();
    expect(stats.todayValue).toBeNull();
  });

  it("il lunedì la domenica appena passata conta nella settimana precedente", () => {
    const monday = "2026-10-19";
    const stats = weeklyHabitStats(
      [day("2026-10-18", 2), day("2026-10-19", 4)],
      monday,
    );
    expect(stats.weekFrom).toBe("2026-10-19");
    expect(stats.filledDays).toBe(1);
    expect(stats.average).toBe(4);
    expect(stats.previousAverage).toBe(2);
    expect(stats.delta).toBe(2);
  });

  it("i valori di due settimane fa non entrano nel confronto", () => {
    const stats = weeklyHabitStats(
      [day("2026-10-14", 4), day("2026-10-04", 1)],
      WEDNESDAY,
    );
    expect(stats.previousAverage).toBeNull();
  });

  it("differenza negativa", () => {
    const stats = weeklyHabitStats(
      [day("2026-10-12", 3), day("2026-10-05", 5)],
      WEDNESDAY,
    );
    expect(stats.delta).toBe(-2);
  });
});

describe("roundOne", () => {
  it("arrotonda a un decimale senza residui", () => {
    expect(roundOne(4.25)).toBe(4.3);
    expect(roundOne(4.5 - 3.7)).toBe(0.8);
    expect(roundOne(13 / 3)).toBe(4.3);
  });
});

describe("habitWeekSeries", () => {
  it("affianca ogni giorno della settimana allo stesso giorno della precedente", () => {
    const series = habitWeekSeries(
      [day("2026-10-12", 4), day("2026-10-05", 3), day("2026-10-11", 5)],
      WEDNESDAY,
    );
    expect(series).toHaveLength(7);
    expect(series[0]).toEqual({ day: "2026-10-12", current: 4, previous: 3 });
    expect(series[1]).toEqual({
      day: "2026-10-13",
      current: null,
      previous: null,
    });
    expect(series[6]).toEqual({
      day: "2026-10-18",
      current: null,
      previous: 5,
    });
  });
});
