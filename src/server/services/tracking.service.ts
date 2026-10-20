import "server-only";

import {
  HABIT_KEYS,
  type CheckinDay,
  type HabitKey,
  type MetricFrequency,
  type MetricValueType,
} from "@/lib/constants/domain";
import { addDays, todayInRome } from "@/lib/domain/tracking/dates";
import {
  buildTrackingOverview,
  effectiveGoal,
  metricKind,
  toRecord,
  type EffectiveGoal,
  type MetricConfig,
  type MetricOverview,
  type PersonalGoal,
  type ToRecordItem,
  type TrackingEntry,
} from "@/lib/domain/tracking/overview";
import { habitScale, type ScaleRow } from "@/lib/domain/tracking/score-scale";
import * as clientsRepository from "@/server/repositories/clients.repository";
import * as trackingRepository from "@/server/repositories/tracking.repository";
import type { ClientProfile } from "@/server/services/session.service";
import {
  entryValuesSchema,
  type EntryValues,
  type MetricLimits,
} from "@/server/validation/tracking.schema";

/**
 * Chi legge o scrive il tracking di un cliente. Nella parte cliente è il
 * cliente stesso: scrive solo In percorso (In pausa e Concluso = sola
 * lettura, T-03); in Onboarding le pagine non arrivano qui (C-09) e la RLS
 * non mostra nulla.
 */
export type TrackingActor = {
  clientId: string;
  studioId: string;
  canWrite: boolean;
};

/** Attore della sessione del cliente; null se lo studio non è noto o il tracking è bloccato. */
export function clientTrackingActor(session: {
  client: ClientProfile;
  studio: { id: string | null };
}): TrackingActor | null {
  if (!session.studio.id || !session.client.unlocked) return null;
  return {
    clientId: session.client.id,
    studioId: session.studio.id,
    canWrite: session.client.journeyStage === "in_progress",
  };
}

// ---------------------------------------------------------------------
// Conversioni dalle righe del database
// ---------------------------------------------------------------------

type MetricRow = Awaited<
  ReturnType<typeof trackingRepository.listMetrics>
>[number];
type EntryRow = Awaited<
  ReturnType<typeof trackingRepository.listEntries>
>[number];

function toMetric(row: MetricRow): MetricConfig {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    unit: row.unit,
    valueType: row.value_type as MetricValueType,
    frequency: row.frequency as MetricFrequency,
    minValue: Number(row.min_value),
    maxValue: Number(row.max_value),
    icon: row.icon,
    instructions: row.instructions,
    sortOrder: row.sort_order,
    defaultGoal: row.default_goal === null ? null : Number(row.default_goal),
    goalUnit: row.goal_unit,
  };
}

function toEntry(row: EntryRow): TrackingEntry {
  return {
    id: row.id,
    metricId: row.metric_id,
    value: Number(row.value),
    recordedOn: row.recorded_on,
    note: row.note,
    createdAt: row.created_at,
  };
}

export function metricLimits(metric: MetricConfig): MetricLimits {
  return {
    kind: metricKind(metric),
    minValue: metric.minValue,
    maxValue: metric.maxValue,
    unit: metric.unit,
  };
}

type TrackingData = {
  metrics: MetricConfig[];
  goals: PersonalGoal[];
  entries: TrackingEntry[];
};

/** Misure, obiettivi e registrazioni: tre query in parallelo, una sola per tutte le registrazioni. */
async function loadTracking(
  studioId: string,
  clientId: string,
): Promise<TrackingData> {
  const [metrics, goals, entries] = await Promise.all([
    trackingRepository.listMetrics(studioId),
    trackingRepository.listGoals(clientId),
    trackingRepository.listEntries(clientId),
  ]);
  return {
    metrics: metrics.map(toMetric),
    goals: goals.map((goal) => ({
      metricId: goal.metric_id,
      goalValue: Number(goal.goal_value),
    })),
    entries: entries.map(toEntry),
  };
}

// ---------------------------------------------------------------------
// Letture
// ---------------------------------------------------------------------

export type ClientTracking = {
  overview: MetricOverview[];
  today: string;
  canWrite: boolean;
};

/** Pagina Tracking (C8, T-01). */
export async function getClientTracking(
  actor: TrackingActor,
): Promise<ClientTracking> {
  const data = await loadTracking(actor.studioId, actor.clientId);
  const today = todayInRome();
  return {
    overview: buildTrackingOverview({ ...data, today }),
    today,
    canWrite: actor.canWrite,
  };
}

export type MetricDetail = {
  item: MetricOverview;
  /** Scala dei voti ancorata all'obiettivo (solo abitudini con obiettivo). */
  scale: ScaleRow[] | null;
  today: string;
  canWrite: boolean;
};

function scaleFor(item: MetricOverview): ScaleRow[] | null {
  if (item.kind !== "habit" || !item.goal) return null;
  return habitScale(item.metric.key, item.goal.value, item.goal.unit);
}

/** Dettaglio di una misura (C10, C11, C12); null se la chiave non esiste. */
export async function getClientMetricDetail(
  actor: TrackingActor,
  metricKey: string,
): Promise<MetricDetail | null> {
  const { overview, today } = await getClientTracking(actor);
  const item = overview.find((entry) => entry.metric.key === metricKey);
  if (!item) return null;
  return { item, scale: scaleFor(item), today, canWrite: actor.canWrite };
}

/** Misure da registrare nella home (C-02); vuoto in sola lettura. */
export async function getHomeToRecord(
  actor: TrackingActor,
): Promise<ToRecordItem[]> {
  if (!actor.canWrite) return [];
  const { overview } = await getClientTracking(actor);
  return toRecord(overview);
}

export type CheckinHabit = {
  metricId: string;
  key: string;
  name: string;
  instructions: string | null;
  icon: string;
  /** Limiti del voto della misura (1–5). */
  minValue: number;
  maxValue: number;
  goal: EffectiveGoal | null;
  scale: ScaleRow[] | null;
  /** Voto già registrato per il giorno scelto (si precarica e si corregge). */
  value: number | null;
};

export type Checkin = {
  day: CheckinDay;
  date: string;
  today: string;
  yesterday: string;
  habits: CheckinHabit[];
  canWrite: boolean;
};

export function checkinDate(day: CheckinDay, today: string): string {
  return day === "today" ? today : addDays(today, -1);
}

/** Abitudini del check-in nell'ordine della schermata (passi, sonno, acqua), poi le altre. */
function habitOrder(metric: MetricConfig): number {
  const index = (HABIT_KEYS as readonly string[]).indexOf(metric.key);
  return index === -1 ? HABIT_KEYS.length + metric.sortOrder : index;
}

/** Check-in giornaliero (C9, T-06, T-07): abitudini, obiettivi, scale e valori del giorno. */
export async function getCheckin(
  actor: TrackingActor,
  day: CheckinDay,
): Promise<Checkin> {
  const { metrics, goals, entries } = await loadTracking(
    actor.studioId,
    actor.clientId,
  );
  const today = todayInRome();
  const date = checkinDate(day, today);
  const habits = metrics
    .filter((metric) => metricKind(metric) === "habit")
    .sort((a, b) => habitOrder(a) - habitOrder(b))
    .map((metric): CheckinHabit => {
      const goal = effectiveGoal(metric, goals);
      return {
        metricId: metric.id,
        key: metric.key,
        name: metric.name,
        instructions: metric.instructions,
        icon: metric.icon,
        minValue: metric.minValue,
        maxValue: metric.maxValue,
        goal,
        scale: goal ? habitScale(metric.key, goal.value, goal.unit) : null,
        value:
          entries.find(
            (entry) =>
              entry.metricId === metric.id && entry.recordedOn === date,
          )?.value ?? null,
      };
    });
  return {
    day,
    date,
    today,
    yesterday: addDays(today, -1),
    habits,
    canWrite: actor.canWrite,
  };
}

// ---------------------------------------------------------------------
// Scritture
// ---------------------------------------------------------------------

export type WriteFailure =
  | {
      ok: false;
      reason: "read_only" | "not_found" | "out_of_range" | "duplicate";
    }
  | {
      ok: false;
      reason: "invalid";
      fieldErrors: Record<string, string[] | undefined>;
    };
export type WriteOutcome<T = object> = ({ ok: true } & T) | WriteFailure;

function fromRepository(
  result: trackingRepository.WriteResult,
): WriteFailure | null {
  switch (result) {
    case "ok":
      return null;
    case "forbidden":
      return { ok: false, reason: "read_only" };
    default:
      return { ok: false, reason: result };
  }
}

function validateValues(
  metric: MetricConfig,
  values: unknown,
): { ok: true; data: EntryValues } | WriteFailure {
  const parsed = entryValuesSchema(metricLimits(metric)).safeParse(values);
  if (parsed.success) return { ok: true, data: parsed.data };
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? "value");
    (fieldErrors[field] ??= []).push(issue.message);
  }
  return { ok: false, reason: "invalid", fieldErrors };
}

async function findMetric(studioId: string, metricId: string) {
  const rows = await trackingRepository.listMetrics(studioId);
  const row = rows.find((metric) => metric.id === metricId);
  return row ? toMetric(row) : null;
}

/** Check-in (T-06): da 1 a 3 voti di oggi o di ieri, salvati insieme. */
export async function saveCheckin(
  actor: TrackingActor,
  input: { day: CheckinDay; values: Record<string, number> },
): Promise<WriteOutcome<{ date: string }>> {
  if (!actor.canWrite) return { ok: false, reason: "read_only" };
  const metrics = (await trackingRepository.listMetrics(actor.studioId)).map(
    toMetric,
  );
  const habits = new Map(
    metrics
      .filter((metric) => metricKind(metric) === "habit")
      .map((metric) => [metric.key, metric]),
  );
  for (const [key, value] of Object.entries(input.values)) {
    const metric = habits.get(key);
    if (!metric) return { ok: false, reason: "not_found" };
    if (value < metric.minValue || value > metric.maxValue) {
      return { ok: false, reason: "out_of_range" };
    }
  }
  const date = checkinDate(input.day, todayInRome());
  const failure = fromRepository(
    await trackingRepository.saveDailyCheckin(
      actor.clientId,
      date,
      input.values,
    ),
  );
  return failure ?? { ok: true, date };
}

/**
 * Nuova circonferenza o nuovo allenamento (T-02, T-04). Le abitudini passano
 * dal check-in. Valori validati con i limiti della misura; il trigger del
 * database resta l'ultimo controllo.
 */
export async function addEntry(
  actor: TrackingActor,
  metricId: string,
  values: unknown,
): Promise<WriteOutcome<{ metricKey: string }>> {
  if (!actor.canWrite) return { ok: false, reason: "read_only" };
  const metric = await findMetric(actor.studioId, metricId);
  if (!metric || metricKind(metric) === "habit") {
    return { ok: false, reason: "not_found" };
  }
  const validated = validateValues(metric, values);
  if (!validated.ok) return validated;
  const { value, recordedOn, note } = validated.data;
  const failure = fromRepository(
    await trackingRepository.insertEntry({
      studioId: actor.studioId,
      clientId: actor.clientId,
      metricId: metric.id,
      value,
      recordedOn: recordedOn!,
      note,
    }),
  );
  return failure ?? { ok: true, metricKey: metric.key };
}

/** La registrazione esiste, è del cliente e la sua misura è dello studio. */
async function loadOwnEntry(actor: TrackingActor, entryId: string) {
  const entry = await trackingRepository.getEntry(entryId);
  if (!entry || entry.client_id !== actor.clientId) return null;
  const metric = await findMetric(actor.studioId, entry.metric_id);
  return metric ? { entry, metric } : null;
}

/** Correzione (T-03): per le abitudini solo il voto, il giorno resta quello. */
export async function updateEntry(
  actor: TrackingActor,
  entryId: string,
  values: unknown,
): Promise<WriteOutcome<{ metricKey: string }>> {
  if (!actor.canWrite) return { ok: false, reason: "read_only" };
  const owned = await loadOwnEntry(actor, entryId);
  if (!owned) return { ok: false, reason: "not_found" };
  const validated = validateValues(owned.metric, values);
  if (!validated.ok) return validated;
  const failure = fromRepository(
    await trackingRepository.updateEntry(entryId, validated.data),
  );
  return failure ?? { ok: true, metricKey: owned.metric.key };
}

/** Eliminazione con conferma (T-03). */
export async function deleteEntry(
  actor: TrackingActor,
  entryId: string,
): Promise<WriteOutcome<{ metricKey: string }>> {
  if (!actor.canWrite) return { ok: false, reason: "read_only" };
  const owned = await loadOwnEntry(actor, entryId);
  if (!owned) return { ok: false, reason: "not_found" };
  const failure = fromRepository(await trackingRepository.deleteEntry(entryId));
  return failure ?? { ok: true, metricKey: owned.metric.key };
}

// ---------------------------------------------------------------------
// Area admin: consultazione (A-12, A-13) e obiettivi personali (T-07)
// ---------------------------------------------------------------------

/** Il cliente esiste ed è dello studio della sessione (RLS + controllo esplicito). */
async function loadOwnedClient(studioId: string, clientId: string) {
  const client = await clientsRepository.getClientProfile(clientId);
  return client?.studio_id === studioId ? client : null;
}

export type StaffGoal = {
  key: HabitKey;
  metricName: string;
  icon: string;
  goal: EffectiveGoal;
};

export type StaffTracking = {
  clientId: string;
  clientName: string;
  overview: MetricOverview[];
  /** Obiettivi effettivi di passi, sonno e acqua, nell'ordine del check-in. */
  goals: StaffGoal[];
  today: string;
};

function isHabitKey(key: string): key is HabitKey {
  return (HABIT_KEYS as readonly string[]).includes(key);
}

/** Scheda Tracking (A9): tutte le misure del cliente; null se non è dello studio. */
export async function getStaffTracking(
  studioId: string,
  clientId: string,
): Promise<StaffTracking | null> {
  const client = await loadOwnedClient(studioId, clientId);
  if (!client) return null;
  const data = await loadTracking(studioId, clientId);
  const today = todayInRome();
  const goals = data.metrics
    .filter((metric) => isHabitKey(metric.key))
    .sort((a, b) => habitOrder(a) - habitOrder(b))
    .flatMap((metric): StaffGoal[] => {
      const goal = effectiveGoal(metric, data.goals);
      return goal
        ? [
            {
              key: metric.key as HabitKey,
              metricName: metric.name,
              icon: metric.icon,
              goal,
            },
          ]
        : [];
    });
  return {
    clientId,
    clientName: [client.first_name, client.last_name].filter(Boolean).join(" "),
    overview: buildTrackingOverview({ ...data, today }),
    goals,
    today,
  };
}

/** Dettaglio di una misura per lo staff (A10, A11); null se cliente o misura non esistono. */
export async function getStaffMetricDetail(
  studioId: string,
  clientId: string,
  metricKey: string,
): Promise<(MetricDetail & { clientName: string }) | null> {
  const tracking = await getStaffTracking(studioId, clientId);
  const item = tracking?.overview.find(
    (entry) => entry.metric.key === metricKey,
  );
  if (!tracking || !item) return null;
  return {
    item,
    scale: scaleFor(item),
    today: tracking.today,
    canWrite: false,
    clientName: tracking.clientName,
  };
}

/**
 * Obiettivi personali (T-07): un valore uguale al predefinito dello studio
 * elimina l'obiettivo personale, così il cliente seguirà il predefinito
 * anche se lo studio lo cambierà. Una sola scrittura per tipo di operazione.
 */
export async function saveGoals(
  studioId: string,
  clientId: string,
  values: Partial<Record<HabitKey, number>>,
): Promise<{ ok: true } | { ok: false; reason: "not_found" }> {
  if (!(await loadOwnedClient(studioId, clientId))) {
    return { ok: false, reason: "not_found" };
  }
  const metrics = (await trackingRepository.listMetrics(studioId)).map(
    toMetric,
  );
  const upserts: Parameters<typeof trackingRepository.upsertGoals>[0] = [];
  const resets: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    const metric = metrics.find((item) => item.key === key);
    if (!metric || value === undefined || metric.defaultGoal === null) {
      return { ok: false, reason: "not_found" };
    }
    if (value === metric.defaultGoal) resets.push(metric.id);
    else
      upserts.push({
        studioId,
        clientId,
        metricId: metric.id,
        goalValue: value,
      });
  }
  await trackingRepository.upsertGoals(upserts);
  await trackingRepository.deleteGoals(clientId, resets);
  return { ok: true };
}

/** "Ripristina predefinito": elimina l'obiettivo personale di un'abitudine. */
export async function resetGoal(
  studioId: string,
  clientId: string,
  key: HabitKey,
): Promise<{ ok: true } | { ok: false; reason: "not_found" }> {
  if (!(await loadOwnedClient(studioId, clientId))) {
    return { ok: false, reason: "not_found" };
  }
  const metric = (await trackingRepository.listMetrics(studioId)).find(
    (item) => item.key === key,
  );
  if (!metric) return { ok: false, reason: "not_found" };
  await trackingRepository.deleteGoals(clientId, [metric.id]);
  return { ok: true };
}
