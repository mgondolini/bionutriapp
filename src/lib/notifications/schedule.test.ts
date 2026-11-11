import { describe, expect, it } from "vitest";

import {
  decideDailyReminder,
  isReminderHour,
  isValidTimeZone,
  localDateTime,
} from "./schedule";

describe("ora locale del promemoria", () => {
  it("Roma in inverno (UTC+1): le 20 sono le 19:00 UTC", () => {
    expect(
      isReminderHour(new Date("2026-01-15T19:00:00Z"), "Europe/Rome"),
    ).toBe(true);
    expect(
      isReminderHour(new Date("2026-01-15T18:00:00Z"), "Europe/Rome"),
    ).toBe(false);
  });

  it("Roma in estate (UTC+2): le 20 sono le 18:00 UTC", () => {
    expect(
      isReminderHour(new Date("2026-07-15T18:00:00Z"), "Europe/Rome"),
    ).toBe(true);
    expect(
      isReminderHour(new Date("2026-07-15T19:00:00Z"), "Europe/Rome"),
    ).toBe(false);
  });

  it("un altro fuso alla stessa ora UTC: New York (UTC-4 in estate)", () => {
    const now = new Date("2026-07-16T00:00:00Z");
    expect(isReminderHour(now, "America/New_York")).toBe(true);
    expect(isReminderHour(now, "Europe/Rome")).toBe(false);
    // giorno locale: per New York è ancora il 15
    expect(localDateTime(now, "America/New_York")).toEqual({
      day: "2026-07-15",
      hour: 20,
    });
  });

  it("nei giorni del cambio d'ora le 20 arrivano una volta sola", () => {
    // 29/03/2026 si passa all'ora legale, 25/10/2026 si torna all'ora solare
    for (const day of ["2026-03-29", "2026-10-25"]) {
      const hours = Array.from(
        { length: 24 },
        (_, h) => new Date(`${day}T${String(h).padStart(2, "0")}:00:00Z`),
      ).filter((now) => isReminderHour(now, "Europe/Rome"));
      expect(hours).toHaveLength(1);
      expect(localDateTime(hours[0], "Europe/Rome").day).toBe(day);
    }
  });

  it("mezzanotte locale: il giorno è quello del fuso, non quello UTC", () => {
    expect(
      localDateTime(new Date("2026-11-06T23:30:00Z"), "Europe/Rome"),
    ).toEqual({
      day: "2026-11-07",
      hour: 0,
    });
  });

  it("riconosce i nomi IANA validi", () => {
    expect(isValidTimeZone("Europe/Rome")).toBe(true);
    expect(isValidTimeZone("America/New_York")).toBe(true);
    expect(isValidTimeZone("Europa/Roma")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});

describe("decideDailyReminder", () => {
  it("abitudini già compilate: salta, anche senza allenamento", () => {
    expect(
      decideDailyReminder({ habitsDone: true, workoutDone: false }),
    ).toEqual({
      send: false,
      reason: "already_completed",
    });
    expect(
      decideDailyReminder({ habitsDone: true, workoutDone: true }),
    ).toEqual({
      send: false,
      reason: "already_completed",
    });
  });

  it("allenamento già registrato: variante base", () => {
    expect(
      decideDailyReminder({ habitsDone: false, workoutDone: true }),
    ).toEqual({
      send: true,
      variant: "base",
    });
  });

  it("nessun allenamento oggi: la variante lo ricorda", () => {
    expect(
      decideDailyReminder({ habitsDone: false, workoutDone: false }),
    ).toEqual({
      send: true,
      variant: "workout",
    });
  });
});
