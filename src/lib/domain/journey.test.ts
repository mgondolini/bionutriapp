import { describe, expect, it } from "vitest";

import { JOURNEY_STAGES, type JourneyStage } from "@/lib/constants/domain";

import {
  availableActions,
  canTransition,
  planStageChange,
  stageOnActivation,
} from "./journey";

const ALLOWED: [JourneyStage, JourneyStage][] = [
  ["onboarding", "in_progress"],
  ["in_progress", "paused"],
  ["in_progress", "completed"],
  ["paused", "in_progress"],
  ["paused", "completed"],
  ["completed", "in_progress"],
];

describe("transizioni di fase", () => {
  it("consente solo le transizioni previste (tutte le 16 coppie)", () => {
    for (const from of JOURNEY_STAGES) {
      for (const to of JOURNEY_STAGES) {
        const expected = ALLOWED.some(([f, t]) => f === from && t === to);
        expect(canTransition(from, to), `${from} → ${to}`).toBe(expected);
      }
    }
  });

  it("vieta il ritorno in Onboarding e i salti", () => {
    expect(planStageChange("in_progress", "onboarding")).toEqual({
      ok: false,
      reason: "not_allowed",
    });
    expect(planStageChange("onboarding", "paused")).toEqual({
      ok: false,
      reason: "not_allowed",
    });
    expect(planStageChange("completed", "paused")).toEqual({
      ok: false,
      reason: "not_allowed",
    });
    expect(planStageChange("paused", "paused")).toEqual({
      ok: false,
      reason: "same_stage",
    });
  });

  it("registra l'autore: manuale per lo staff, automatico per il sistema (v2.0)", () => {
    expect(planStageChange("onboarding", "in_progress")).toEqual({
      ok: true,
      change: { from: "onboarding", to: "in_progress", source: "manual" },
    });
    expect(planStageChange("onboarding", "in_progress", "automatic")).toEqual({
      ok: true,
      change: { from: "onboarding", to: "in_progress", source: "automatic" },
    });
  });

  it("pulsanti della scheda per ogni fase", () => {
    expect(availableActions("onboarding")).toEqual([
      { to: "in_progress", action: "complete_onboarding" },
    ]);
    expect(availableActions("in_progress")).toEqual([
      { to: "paused", action: "pause" },
      { to: "completed", action: "complete" },
    ]);
    expect(availableActions("paused")).toEqual([
      { to: "in_progress", action: "resume" },
      { to: "completed", action: "complete" },
    ]);
    expect(availableActions("completed")).toEqual([
      { to: "in_progress", action: "resume" },
    ]);
  });

  it("fase all'attivazione decisa dall'origine", () => {
    expect(stageOnActivation("imported")).toBe("in_progress");
    expect(stageOnActivation("new")).toBe("onboarding");
  });
});
