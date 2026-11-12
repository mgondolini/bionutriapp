/**
 * Riepilogo del tracking di un cliente (T-01, T-05, T-08, C-02, A-12):
 * dalle misure dello studio, dagli obiettivi personali e da TUTTE le
 * registrazioni del cliente (una sola query) ricava il modello di ogni
 * misura per le card, le spunte del periodo e l'elenco "Da registrare".
 */
import {
  METRIC_KIND_BY_FREQUENCY,
  type EntryAuthorRole,
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
import { measureCheck, type MeasureCheck } from "./measure-check";
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
  /** Chi l'ha inserita e chi l'ha modificata per ultimo (A-16). */
  createdByRole: EntryAuthorRole;
  updatedByRole: EntryAuthorRole;
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
  /** Data del check scelta dal nutrizionista (vale per peso e circonferenze). */
  staffDueOn: string | null = null,
): MetricOverview {
  const entries = [...metricEntries].sort(byRecordedDesc);
  switch (metricKind(metric)) {
    case "circumference": {
      const summary = circumferenceSummary(entries, today, staffDueOn);
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

/** Data del check scelta dal nutrizionista (`clients.measure_check_on`). */
export type MeasureCheckOverride = { on: string; setAt: string | null };

/** Prossimo check del cliente dalle registrazioni mensili (peso e circonferenze). */
export function measureCheckOf(input: {
  metrics: readonly MetricConfig[];
  entries: readonly TrackingEntry[];
  override: MeasureCheckOverride | null;
}): MeasureCheck {
  const monthly = new Set(
    input.metrics
      .filter((metric) => metricKind(metric) === "circumference")
      .map((metric) => metric.id),
  );
  let lastRecordedOn: string | null = null;
  let lastCreatedAt: string | null = null;
  for (const entry of input.entries) {
    if (!monthly.has(entry.metricId)) continue;
    if (!lastRecordedOn || entry.recordedOn > lastRecordedOn)
      lastRecordedOn = entry.recordedOn;
    if (
      !lastCreatedAt ||
      Date.parse(entry.createdAt) > Date.parse(lastCreatedAt)
    )
      lastCreatedAt = entry.createdAt;
  }
  return measureCheck({
    override: input.override?.on ?? null,
    overrideSetAt: input.override?.setAt ?? null,
    lastRecordedOn,
    lastCreatedAt,
  });
}

/** Tutte le misure attive, nell'ordine dello studio. Le registrazioni si raggruppano una sola volta. */
export function buildTrackingOverview(input: {
  metrics: readonly MetricConfig[];
  goals: readonly PersonalGoal[];
  entries: readonly TrackingEntry[];
  today: string;
  /** Prossimo check: se l'ha scelto il nutrizionista vale per tutte le misure mensili. */
  check?: MeasureCheck;
}): MetricOverview[] {
  const staffDueOn = input.check?.source === "staff" ? input.check.dueOn : null;
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
        staffDueOn,
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
    }
  /** Sempre presente: invito a registrare la sessione, non una scadenza. */
  | { kind: "workout"; item: WorkoutOverview };

/** Gravità per l'ordinamento: prima i ritardi, poi le scadenze, poi le mai registrate. */
const STATUS_ORDER: Record<Exclude<CircumferenceStatus, "ok">, number> = {
  overdue: 0,
  due_soon: 1,
  never: 2,
};

/**
 * "Da registrare" della home (C-02, C5): check-in di oggi non completo,
 * circonferenze in ritardo, in scadenza entro 3 giorni o mai registrate e,
 * sempre in fondo, gli allenamenti (si registrano a ogni sessione).
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
  for (const item of overview) {
    if (item.kind === "workout") items.push({ kind: "workout", item });
  }
  return items;
}

/** Voci che chiedono davvero una registrazione: gli allenamenti non scadono. */
export function pendingCount(items: readonly ToRecordItem[]): number {
  return items.filter((item) => item.kind !== "workout").length;
}

export type CircumferenceProgress = {
  total: number;
  /** Misure con un valore nel periodo (spunta di T-01). */
  recorded: number;
  /** Da registrare: mai registrate o oltre i 30 giorni, nell'ordine dello studio. */
  missing: CircumferenceOverview[];
  /** Solo quelle in ritardo (T-05). */
  overdue: CircumferenceOverview[];
};

/** Riepilogo di peso e circonferenze per la pagina Tracking del cliente (C8). */
export function circumferenceProgress(
  overview: readonly MetricOverview[],
): CircumferenceProgress {
  const items = overview.filter(
    (item): item is CircumferenceOverview => item.kind === "circumference",
  );
  const missing = items.filter((item) => !item.recordedInPeriod);
  return {
    total: items.length,
    recorded: items.length - missing.length,
    missing,
    overdue: items.filter((item) => item.summary.schedule.status === "overdue"),
  };
}
