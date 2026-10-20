import { describe, expect, it } from "vitest";

import {
  addDays,
  daysBetween,
  isBetween,
  todayInRome,
  weekDays,
  weekStart,
} from "./dates";

describe("todayInRome", () => {
  it("dopo la mezzanotte di Roma è già il giorno dopo, anche se in UTC no", () => {
    // 23:30 UTC del 18 ottobre = 01:30 del 19 a Roma (ora legale, UTC+2)
    expect(todayInRome(new Date("2026-10-18T23:30:00Z"))).toBe("2026-10-19");
    // 21:59 UTC = 23:59 a Roma: ancora il 18
    expect(todayInRome(new Date("2026-10-18T21:59:00Z"))).toBe("2026-10-18");
  });

  it("con l'ora solare (UTC+1) la mezzanotte cade alle 23 UTC", () => {
    expect(todayInRome(new Date("2026-12-31T22:59:00Z"))).toBe("2026-12-31");
    expect(todayInRome(new Date("2026-12-31T23:00:00Z"))).toBe("2027-01-01");
  });
});

describe("addDays e daysBetween", () => {
  it("attraversano mesi, anni e il cambio dell'ora", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30"); // ora legale il 29 marzo
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(daysBetween("2026-10-24", "2026-10-26")).toBe(2); // ora solare il 25 ottobre
    expect(daysBetween("2026-09-08", "2026-10-14")).toBe(36);
    expect(daysBetween("2026-10-14", "2026-09-08")).toBe(-36);
  });
});

describe("weekStart", () => {
  it("la settimana va da lunedì a domenica", () => {
    expect(weekStart("2026-10-19")).toBe("2026-10-19"); // lunedì
    expect(weekStart("2026-10-14")).toBe("2026-10-12"); // mercoledì
    expect(weekStart("2026-10-18")).toBe("2026-10-12"); // domenica
  });

  it("attraversa il cambio d'anno", () => {
    expect(weekStart("2027-01-01")).toBe("2026-12-28");
  });

  it("weekDays restituisce i 7 giorni dal lunedì", () => {
    expect(weekDays("2026-10-12")).toEqual([
      "2026-10-12",
      "2026-10-13",
      "2026-10-14",
      "2026-10-15",
      "2026-10-16",
      "2026-10-17",
      "2026-10-18",
    ]);
  });
});

describe("isBetween", () => {
  it("include gli estremi", () => {
    expect(isBetween("2026-10-12", "2026-10-12", "2026-10-18")).toBe(true);
    expect(isBetween("2026-10-18", "2026-10-12", "2026-10-18")).toBe(true);
    expect(isBetween("2026-10-19", "2026-10-12", "2026-10-18")).toBe(false);
  });
});
