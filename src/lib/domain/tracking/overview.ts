/**
 * Riepilogo del tracking di un cliente (T-01, T-05, T-08, C-02, A-12):
 * dalle misure dello studio, dagli obiettivi personali e da TUTTE le
 * registrazioni del cliente (una sola query) ricava il modello di ogni
 * misura per le card, le spunte del periodo e l'elenco "Da registrare".
 */
import {
  METRIC_KIND_BY_FREQUENCY,
  type MetricFrequency,
  type MetricKind,
  type MetricValueType,
} from "@/lib/constants/domain";

import {
  circumferenceSummary,
  isRecordedInPeriod,
  type CircumferenceStatus,
  type CircumferenceSummary,
} from "./circumferences";
import { weeklyHabitStats, type WeeklyHabitStats } from "./habits";
import { workoutStats, type WorkoutStats } from "./workouts";

/** Configurazione di una misura dello studio (tabella metrics). */
export type MetricConfig = {
  id: string;
  key: string;
  name: string;
  unit: string | null;
  valueType: MetricValueType;
  frequency: MetricFrequency;
  minValue: number;
  maxValue: number;
  icon: string;
  instructions: string | null;
  sortOrder: number;
  /** Obiettivo predefinito dello studio (solo abitudini). */
  defaultGoal: number | null;
  goalUnit: string | null;
};

export type TrackingEntry = {
  id: string;
  metricId: string;
  value: number;
  recordedOn: string;
  note: string | null;
  createdAt: string;
};

/** Obiettivo personale del cliente (tabella client_metric_goals). */
export type PersonalGoal = { metricId: string; goalValue: number };

export type EffectiveGoal = {
  value: number;
  unit: string;
  /** Vero se è l'obiettivo personale del cliente, falso se è quello dello studio. */
  personal: boolean;
  /** Obiettivo predefinito dello studio, da mostrare accanto a quello personale. */
  studioDefault: number;
};

/** Obiettivo effettivo (T-07): quello personale se c'è, altrimenti il predefinito dello studio. */
export function effectiveGoal(
  metric: MetricConfig,
  goals: readonly PersonalGoal[],
): EffectiveGoal | null {
  if (metric.defaultGoal === null || metric.goalUnit === null) return null;
  const personal = goals.find((goal) => goal.metricId === metric.id);
  return {
    value: personal?.goalValue ?? metric.defaultGoal,
    unit: metric.goalUnit,
    personal: personal !== undefined,
    studioDefault: metric.defaultGoal,
  };
}

type OverviewBase = {
  metric: MetricConfig;
  /** Registrazioni della misura, dalla più recente. */
  entries: TrackingEntry[];
  /** Spunta di T-01: misura già registrata nel periodo corrente. */
  recordedInPeriod: boolean;
};

export type CircumferenceOverview = OverviewBase & {
  kind: "circumference";
  summary: CircumferenceSummary<TrackingEntry>;
};

export type HabitOverview = OverviewBase & {
  kind: "habit";
  goal: EffectiveGoal | null;
  stats: WeeklyHabitStats;
};

export type WorkoutOverview = OverviewBase & {
  kind: "workout";
  stats: WorkoutStats<TrackingEntry>;
};

export type MetricOverview =
  CircumferenceOverview | HabitOverview | WorkoutOverview;

export function metricKind(
  metric: Pick<MetricConfig, "frequency">,
): MetricKind {
  return METRIC_KIND_BY_FREQUENCY[metric.frequency];
}

/** Dalla più recente; a parità di giorno, l'ultima inserita. */
export function byRecordedDesc(a: TrackingEntry, b: TrackingEntry): number {
  if (a.recordedOn !== b.recordedOn)
    return a.recordedOn < b.recordedOn ? 1 : -1;
  return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0;
}

/** Modello di una misura con le sue registrazioni (già filtrate per misura). */
export function metricOverview(
  metric: MetricConfig,
  metricEntries: readonly TrackingEntry[],
  goals: readonly PersonalGoal[],
  today: string,
): MetricOverview {
  const entries = [...metricEntries].sort(byRecordedDesc);
  switch (metricKind(metric)) {
    case "circumference": {
      const summary = circumferenceSummary(entries, today);
      return {
        kind: "circumference",
        metric,
        entries,
        summary,
        recordedInPeriod: isRecordedInPeriod(summary.schedule),
      };
    }
    case "habit": {
      const stats = weeklyHabitStats(entries, today);
      return {
        kind: "habit",
        metric,
        entries,
        goal: effectiveGoal(metric, goals),
        stats,
        recordedInPeriod: stats.todayValue !== null,
      };
    }
    case "workout":
      return {
        kind: "workout",
        metric,
        entries,
        stats: workoutStats(entries, today),
        recordedInPeriod: entries.some((entry) => entry.recordedOn === today),
      };
  }
}

/** Tutte le misure attive, nell'ordine dello studio. Le registrazioni si raggruppano una sola volta. */
export function buildTrackingOverview(input: {
  metrics: readonly MetricConfig[];
  goals: readonly PersonalGoal[];
  entries: readonly TrackingEntry[];
  today: string;
}): MetricOverview[] {
  const byMetric = new Map<string, TrackingEntry[]>();
  for (const entry of input.entries) {
    const list = byMetric.get(entry.metricId);
    if (list) list.push(entry);
    else byMetric.set(entry.metricId, [entry]);
  }
  return [...input.metrics]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((metric) =>
      metricOverview(
        metric,
        byMetric.get(metric.id) ?? [],
        input.goals,
        input.today,
      ),
    );
}

export type CheckinStatus = {
  habits: HabitOverview[];
  /** Abitudini senza il voto di oggi. */
  missing: HabitOverview[];
};

/** Stato del check-in di oggi (card di C8 e riga della home). */
export function checkinStatus(
  overview: readonly MetricOverview[],
): CheckinStatus {
  const habits = overview.filter(
    (item): item is HabitOverview => item.kind === "habit",
  );
  return {
    habits,
    missing: habits.filter((habit) => !habit.recordedInPeriod),
  };
}

export type ToRecordItem =
  | { kind: "checkin"; missing: HabitOverview[] }
  | {
      kind: "circumference";
      item: CircumferenceOverview;
      status: Exclude<CircumferenceStatus, "ok">;
    };

/** Gravità per l'ordinamento: prima i ritardi, poi le scadenze, poi le mai registrate. */
const STATUS_ORDER: Record<Exclude<CircumferenceStatus, "ok">, number> = {
  overdue: 0,
  due_soon: 1,
  never: 2,
};

/**
 * "Da registrare" della home (C-02, C5): check-in di oggi non completo e
 * circonferenze in ritardo, in scadenza entro 3 giorni o mai registrate.
 */
export function toRecord(overview: readonly MetricOverview[]): ToRecordItem[] {
  const items: ToRecordItem[] = [];
  const { habits, missing } = checkinStatus(overview);
  if (habits.length > 0 && missing.length > 0) {
    items.push({ kind: "checkin", missing });
  }
  const circumferences = overview
    .filter(
      (item): item is CircumferenceOverview => item.kind === "circumference",
    )
    .flatMap((item) => {
      const status = item.summary.schedule.status;
      return status === "ok" ? [] : [{ item, status }];
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  for (const { item, status } of circumferences) {
    items.push({ kind: "circumference", item, status });
  }
  return items;
}
