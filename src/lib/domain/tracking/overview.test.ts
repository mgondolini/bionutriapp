import { describe, expect, it } from "vitest";

import {
  buildTrackingOverview,
  checkinStatus,
  effectiveGoal,
  toRecord,
  type MetricConfig,
  type TrackingEntry,
} from "./overview";

const metric = (
  key: string,
  frequency: MetricConfig["frequency"],
  sortOrder: number,
  extra: Partial<MetricConfig> = {},
): MetricConfig => ({
  id: `m-${key}`,
  key,
  name: key,
  unit: frequency === "monthly_30d" ? "cm" : "voto",
  valueType:
    frequency === "monthly_30d"
      ? "decimal"
      : frequency === "daily"
        ? "score_1_5"
        : "score_1_10",
  frequency,
  minValue: frequency === "monthly_30d" ? 10 : 1,
  maxValue: frequency === "monthly_30d" ? 250 : frequency === "daily" ? 5 : 10,
  icon: "ruler",
  instructions: null,
  sortOrder,
  defaultGoal: null,
  goalUnit: null,
  ...extra,
});

const METRICS: MetricConfig[] = [
  metric("workouts", "per_session", 90),
  metric("water", "daily", 80, { defaultGoal: 2, goalUnit: "L" }),
  metric("steps", "daily", 60, { defaultGoal: 8000, goalUnit: "passi" }),
  metric("sleep", "daily", 70, { defaultGoal: 7, goalUnit: "ore" }),
  metric("circ_waist", "monthly_30d", 10),
  metric("circ_navel", "monthly_30d", 20),
  metric("circ_glutes", "monthly_30d", 30),
];

const TODAY = "2026-10-14";
let seq = 0;
const entry = (
  key: string,
  value: number,
  recordedOn: string,
  createdAt = `2026-10-01T00:00:${String(seq++).padStart(2, "0")}Z`,
): TrackingEntry => ({
  id: `e${seq}`,
  metricId: `m-${key}`,
  value,
  recordedOn,
  note: null,
  createdAt,
});

describe("effectiveGoal", () => {
  const water = METRICS[1]!;

  it("senza obiettivo personale vale quello dello studio", () => {
    expect(effectiveGoal(water, [])).toEqual({
      value: 2,
      unit: "L",
      personal: false,
      studioDefault: 2,
    });
  });

  it("l'obiettivo personale prevale su quello dello studio", () => {
    expect(
      effectiveGoal(water, [{ metricId: "m-water", goalValue: 2.5 }]),
    ).toEqual({ value: 2.5, unit: "L", personal: true, studioDefault: 2 });
  });

  it("le misure senza obiettivo (circonferenze, allenamenti) non ne hanno", () => {
    expect(effectiveGoal(METRICS[4]!, [])).toBeNull();
  });
});

describe("buildTrackingOverview", () => {
  const overview = buildTrackingOverview({
    metrics: METRICS,
    goals: [{ metricId: "m-water", goalValue: 2.5 }],
    entries: [
      entry("circ_waist", 80, "2026-09-08"),
      entry("circ_waist", 77, "2026-10-10"),
      entry("circ_glutes", 98, "2026-09-17"),
      entry("steps", 4, TODAY),
      entry("water", 3, "2026-10-13"),
      entry("workouts", 8, TODAY),
      entry("workouts", 6, "2026-10-12"),
    ],
    today: TODAY,
  });
  const byKey = new Map(overview.map((item) => [item.metric.key, item]));

  it("ordina le misure come lo studio", () => {
    expect(overview.map((item) => item.metric.key)).toEqual([
      "circ_waist",
      "circ_navel",
      "circ_glutes",
      "steps",
      "sleep",
      "water",
      "workouts",
    ]);
  });

  it("raggruppa e ordina le registrazioni dalla più recente", () => {
    const waist = byKey.get("circ_waist")!;
    expect(waist.entries.map((e) => e.recordedOn)).toEqual([
      "2026-10-10",
      "2026-09-08",
    ]);
    expect(waist.kind === "circumference" && waist.summary.delta).toBe(-3);
  });

  it("spunta del periodo: circonferenze negli ultimi 30 giorni, abitudini oggi, allenamenti oggi", () => {
    expect(byKey.get("circ_waist")!.recordedInPeriod).toBe(true);
    expect(byKey.get("circ_navel")!.recordedInPeriod).toBe(false);
    expect(byKey.get("steps")!.recordedInPeriod).toBe(true);
    expect(byKey.get("water")!.recordedInPeriod).toBe(false); // solo ieri
    expect(byKey.get("workouts")!.recordedInPeriod).toBe(true);
  });

  it("le abitudini portano l'obiettivo effettivo", () => {
    const water = byKey.get("water")!;
    const steps = byKey.get("steps")!;
    expect(water.kind === "habit" && water.goal?.value).toBe(2.5);
    expect(steps.kind === "habit" && steps.goal?.personal).toBe(false);
  });

  it("stato del check-in: mancano sonno e acqua", () => {
    const status = checkinStatus(overview);
    expect(status.habits).toHaveLength(3);
    expect(status.missing.map((h) => h.metric.key)).toEqual(["sleep", "water"]);
  });

  it("da registrare: check-in incompleto, poi circonferenze in scadenza e mai registrate", () => {
    const items = toRecord(overview);
    expect(
      items.map((item) =>
        item.kind === "checkin"
          ? `checkin:${item.missing.length}`
          : `${item.item.metric.key}:${item.status}`,
      ),
    ).toEqual(["checkin:2", "circ_glutes:due_soon", "circ_navel:never"]);
  });

  it("le circonferenze in ritardo vengono prima", () => {
    const items = toRecord(
      buildTrackingOverview({
        metrics: METRICS,
        goals: [],
        entries: [
          entry("circ_waist", 80, "2026-10-12"),
          entry("circ_navel", 80, "2026-09-17"),
          entry("circ_glutes", 98, "2026-09-01"),
          entry("steps", 4, TODAY),
          entry("sleep", 4, TODAY),
          entry("water", 4, TODAY),
        ],
        today: TODAY,
      }),
    );
    expect(
      items.map((item) => item.kind === "circumference" && item.status),
    ).toEqual(["overdue", "due_soon"]);
  });

  it("a parità di giorno conta l'ultima inserita", () => {
    const [waist] = buildTrackingOverview({
      metrics: [METRICS[4]!],
      goals: [],
      entries: [
        entry("circ_waist", 80, TODAY, "2026-10-14T08:00:00Z"),
        entry("circ_waist", 79.5, TODAY, "2026-10-14T09:00:00Z"),
      ],
      today: TODAY,
    });
    expect(waist!.entries[0]!.value).toBe(79.5);
  });
});
