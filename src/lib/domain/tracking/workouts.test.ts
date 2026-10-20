import { describe, expect, it } from "vitest";

import { workoutStats } from "./workouts";

const session = (recordedOn: string, value: number) => ({ recordedOn, value });

describe("workoutStats", () => {
  // mercoledì 14 ottobre: settimana dal 12, ultimi 30 giorni dal 15 settembre
  const today = "2026-10-14";
  const entries = [
    session("2026-10-13", 8),
    session("2026-10-12", 6),
    session("2026-10-10", 8),
    session("2026-09-15", 7),
    session("2026-09-14", 9),
  ];

  it("voto medio di tutte le sessioni e ultima sessione", () => {
    const stats = workoutStats(entries, today);
    expect(stats.all).toEqual({ count: 5, average: 7.6 });
    expect(stats.last).toEqual(session("2026-10-13", 8));
  });

  it("sessioni e media della settimana corrente (da lunedì)", () => {
    expect(workoutStats(entries, today).week).toEqual({ count: 2, average: 7 });
  });

  it("ultimi 30 giorni, oggi compreso", () => {
    expect(workoutStats(entries, today).recent).toEqual({
      count: 4,
      average: 7.3,
    });
  });

  it("senza sessioni le medie sono vuote", () => {
    const stats = workoutStats([], today);
    expect(stats.all).toEqual({ count: 0, average: null });
    expect(stats.week.average).toBeNull();
    expect(stats.last).toBeNull();
  });
});
