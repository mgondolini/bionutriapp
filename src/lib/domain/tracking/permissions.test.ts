import { describe, expect, it } from "vitest";

import { JOURNEY_STAGES } from "@/lib/constants/domain";

import { canEditEntry, canWriteTracking } from "./permissions";

const STAFF = { role: "staff" } as const;
const clientIn = (journeyStage: (typeof JOURNEY_STAGES)[number]) =>
  ({ role: "client", journeyStage }) as const;

const ofClient = { createdByRole: "client" } as const;
const ofStaff = { createdByRole: "staff" } as const;

describe("canEditEntry", () => {
  it.each(JOURNEY_STAGES)(
    "lo staff modifica tutto, anche con il cliente in fase %s",
    () => {
      expect(canEditEntry(ofClient, STAFF)).toBe(true);
      expect(canEditEntry(ofStaff, STAFF)).toBe(true);
    },
  );

  it("il cliente In percorso modifica le proprie registrazioni", () => {
    expect(canEditEntry(ofClient, clientIn("in_progress"))).toBe(true);
  });

  it("il cliente non modifica le registrazioni dello staff", () => {
    expect(canEditEntry(ofStaff, clientIn("in_progress"))).toBe(false);
  });

  it.each(["onboarding", "paused", "completed"] as const)(
    "il cliente in fase %s non modifica nulla",
    (stage) => {
      expect(canEditEntry(ofClient, clientIn(stage))).toBe(false);
      expect(canEditEntry(ofStaff, clientIn(stage))).toBe(false);
    },
  );
});

describe("canWriteTracking", () => {
  it("lo staff scrive sempre, il cliente solo In percorso", () => {
    expect(canWriteTracking(STAFF)).toBe(true);
    expect(
      JOURNEY_STAGES.filter((stage) => canWriteTracking(clientIn(stage))),
    ).toEqual(["in_progress"]);
  });
});
