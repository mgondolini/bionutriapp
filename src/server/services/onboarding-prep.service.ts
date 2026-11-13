import "server-only";

import type { JourneyStage, MetricFrequency } from "@/lib/constants/domain";
import { getPrepStatus, type PrepStatus } from "@/lib/onboarding-prep/status";
import * as prepRepository from "@/server/repositories/onboarding-prep.repository";
import { todayInRome } from "@/lib/domain/tracking/dates";
import { notifyPrepIntro } from "@/server/services/journey-notifications.service";
import * as journeysService from "@/server/services/journeys.service";
import {
  metricLimits,
  type MetricLimits,
} from "@/server/validation/tracking.schema";
import { prepMeasuresFormSchema } from "@/server/validation/onboarding-prep.schema";

/*
 * Preparazione della chiamata di onboarding (C28–C32, A1, A5, A27): misure
 * di partenza (tutte le misure mensili dello studio, salvate come
 * registrazioni del Tracking) e foto di partenza (il set della sessione di
 * onboarding). La chiamata è la sessione di onboarding del percorso attivo.
 * Nessun blocco: se manca qualcosa la chiamata si fa comunque.
 */

export type PrepMeasureItem = {
  metricId: string;
  key: string;
  name: string;
  unit: string | null;
  limits: MetricLimits;
  /** Ultima registrazione, anche inserita dal nutrizionista. */
  value: number | null;
  recordedOn: string | null;
};

export type PrepView = {
  clientId: string;
  stage: JourneyStage;
  pushEnabled: boolean;
  /** Sessione di onboarding del percorso attivo; null senza percorso. */
  call: { sessionId: string; date: string; time: string | null } | null;
  status: PrepStatus;
  measures: {
    done: number;
    total: number;
    /** Ultimo invio o correzione (timestamp). */
    sentAt: string | null;
    recordedOn: string | null;
    items: PrepMeasureItem[];
  };
  photos: {
    status: "draft" | "saved" | null;
    count: number;
    savedAt: string | null;
    savedByRole: "client" | "studio" | null;
  };
};

type PrepRow = NonNullable<
  Awaited<ReturnType<typeof prepRepository.getClientPrep>>
>;

function statusOf(row: PrepRow): PrepStatus {
  return getPrepStatus({
    measuresDone: row.measures_done ?? 0,
    measuresTotal: row.measures_total ?? 0,
    photosStatus: (row.photos_status as "draft" | "saved" | null) ?? null,
    photosCount: row.photos_count ?? 0,
  });
}

async function buildView(row: PrepRow, studioId: string): Promise<PrepView> {
  const metrics = await prepRepository.listPrepMetrics(studioId);
  const entries = await prepRepository.listPrepEntries(
    row.client_id!,
    metrics.map((metric) => metric.id),
  );
  const latest = new Map<string, (typeof entries)[number]>();
  for (const entry of entries) {
    if (!latest.has(entry.metric_id)) latest.set(entry.metric_id, entry);
  }
  return {
    clientId: row.client_id!,
    stage: row.journey_stage as JourneyStage,
    pushEnabled: Boolean(row.push_enabled),
    call:
      row.call_session_id && row.call_date
        ? {
            sessionId: row.call_session_id,
            date: row.call_date,
            time: row.call_time ? row.call_time.slice(0, 5) : null,
          }
        : null,
    status: statusOf(row),
    measures: {
      done: row.measures_done ?? 0,
      total: row.measures_total ?? 0,
      sentAt: row.measures_sent_at,
      recordedOn: row.measures_recorded_on,
      items: metrics.map((metric) => {
        const entry = latest.get(metric.id);
        return {
          metricId: metric.id,
          key: metric.key,
          name: metric.name,
          unit: metric.unit,
          limits: metricLimits({
            frequency: metric.frequency as MetricFrequency,
            minValue: Number(metric.min_value),
            maxValue: Number(metric.max_value),
            unit: metric.unit,
          }),
          value: entry ? Number(entry.value) : null,
          recordedOn: entry?.recorded_on ?? null,
        };
      }),
    },
    photos: {
      status: (row.photos_status as "draft" | "saved" | null) ?? null,
      count: row.photos_count ?? 0,
      savedAt: row.photos_saved_at,
      savedByRole:
        (row.photos_saved_by_role as "client" | "studio" | null) ?? null,
    },
  };
}

/** Cliente della sessione (C4, C28–C31). */
export async function getOwnPrep(studioId: string): Promise<PrepView | null> {
  const row = await prepRepository.getOwnPrep();
  return row?.client_id ? buildView(row as PrepRow, studioId) : null;
}

/** Scheda di un cliente dello studio (A5); null se non è dello studio. */
export async function getStaffPrep(
  studioId: string,
  clientId: string,
): Promise<PrepView | null> {
  const row = await prepRepository.getClientPrep(clientId);
  return row?.client_id ? buildView(row, studioId) : null;
}

/** Stato dei clienti in Onboarding con l'account attivo (chip di A1). */
export async function listStudioPrep(
  studioId: string,
): Promise<Map<string, PrepStatus>> {
  const rows = await prepRepository.listStudioPrep(studioId);
  return new Map(
    rows
      .filter((row) => row.client_id && row.account_status === "active")
      .map((row) => [row.client_id!, statusOf(row)]),
  );
}

// ---------------------------------------------------------------------
// Scritture
// ---------------------------------------------------------------------

export type SaveMeasuresResult =
  | { ok: true }
  | {
      ok: false;
      reason: "not_onboarding" | "invalid" | "out_of_range";
      fieldErrors?: Record<string, string[]>;
    };

/**
 * Misure di partenza del cliente (C29): rivalidate con i limiti del
 * database, poi salvate tutte insieme (RPC save_onboarding_measures).
 */
export async function saveOwnMeasures(
  client: { studioId: string; stage: JourneyStage },
  input: { recordedOn: string; values: Record<string, string> },
): Promise<SaveMeasuresResult> {
  if (client.stage !== "onboarding") {
    return { ok: false, reason: "not_onboarding" };
  }
  const metrics = await prepRepository.listPrepMetrics(client.studioId);
  const schema = prepMeasuresFormSchema(
    metrics.map((metric) => ({
      key: metric.key,
      limits: metricLimits({
        frequency: metric.frequency as MetricFrequency,
        minValue: Number(metric.min_value),
        maxValue: Number(metric.max_value),
        unit: metric.unit,
      }),
    })),
  );
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of parsed.error.issues) {
      const field =
        issue.path[0] === "values"
          ? String(issue.path[1])
          : String(issue.path[0]);
      (fieldErrors[field] ??= []).push(issue.message);
    }
    return { ok: false, reason: "invalid", fieldErrors };
  }
  const result = await prepRepository.saveOwnMeasures(
    parsed.data.recordedOn,
    parsed.data.values as Record<string, number>,
  );
  if (result === "forbidden") return { ok: false, reason: "not_onboarding" };
  if (result === "out_of_range") return { ok: false, reason: "out_of_range" };
  return { ok: true };
}

export type SetCallResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "no_call" | "not_onboarding" };

/**
 * Data e ora della chiamata (A5): sono quelle della sessione di onboarding
 * del percorso attivo. Il cambio arriva al cliente con la push "data
 * cambiata" del percorso.
 */
export async function setCall(
  studioId: string,
  input: { clientId: string; date: string; time: string | null },
): Promise<SetCallResult> {
  const row = await prepRepository.getClientPrep(input.clientId);
  if (!row?.client_id) return { ok: false, reason: "not_found" };
  if (row.journey_stage !== "onboarding") {
    return { ok: false, reason: "not_onboarding" };
  }
  if (!row.call_session_id) return { ok: false, reason: "no_call" };
  const result = await journeysService.rescheduleSession(studioId, {
    sessionId: row.call_session_id,
    date: input.date,
    time: input.time,
  });
  if (!result.ok) {
    return {
      ok: false,
      reason: result.reason === "not_found" ? "not_found" : "no_call",
    };
  }
  return { ok: true };
}

/**
 * Prima attivazione delle notifiche di un cliente in Onboarding (C32): la
 * push di presentazione, se c'è una chiamata in arrivo e manca qualcosa.
 */
export async function introduceOwnPrep(client: {
  id: string;
  studioId: string;
  userId: string;
}): Promise<void> {
  const row = await prepRepository.getOwnPrep();
  if (!row?.call_session_id || !row.call_date) return;
  if (row.call_date < todayInRome() || statusOf(row as PrepRow).complete)
    return;
  notifyPrepIntro({
    sessionId: row.call_session_id,
    studioId: client.studioId,
    clientId: client.id,
    userId: client.userId,
    callDate: row.call_date,
  });
}
