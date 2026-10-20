// Schemi Zod condivisi tra form (client) e Server Actions: niente "server-only".
// I limiti di ogni misura stanno nel database (metrics.min_value/max_value):
// gli schemi dei valori si costruiscono a partire dalla misura, uguali nel
// form e nella Server Action (T-04). Il trigger validate_tracking_entry resta
// l'ultimo controllo.
import { z } from "zod";

import {
  CHECKIN_DAY_SLUGS,
  CHECKIN_DAYS,
  HABIT_GOAL_LIMITS,
  HABIT_KEYS,
  HABIT_SCORE_RANGE,
  type HabitKey,
  MEASURE_DECIMALS,
  TRACKING_NOTE_MAX,
  type MetricKind,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { todayInRome } from "@/lib/domain/tracking/dates";
import { formatNumber } from "@/lib/format";

const v = copy.tracking.validation;

/** Limiti di una misura, come arrivano dal database. */
export type MetricLimits = {
  kind: MetricKind;
  minValue: number;
  maxValue: number;
  unit: string | null;
};

const DECIMAL_PATTERN = /^\d+(?:[.,](\d+))?$/;

/** "76,4" o "76.4" → 76.4; null se non è un numero positivo. */
export function parseDecimalInput(raw: string): number | null {
  const match = DECIMAL_PATTERN.exec(raw.trim());
  return match ? Number(raw.trim().replace(",", ".")) : null;
}

/** Data della registrazione: un giorno valido, non futuro a Roma (T-02). */
export const recordedOnSchema = z.iso
  .date(v.dateRequired)
  .refine((day) => day <= todayInRome(), v.dateFuture);

/** Nota facoltativa (solo allenamenti): testo semplice, vuota = nessuna nota. */
const noteSchema = z
  .string()
  .trim()
  .max(TRACKING_NOTE_MAX, v.noteTooLong)
  .transform((value) => value || null);

function rangeMessage(limits: MetricLimits) {
  return v
    .valueRange(
      formatNumber(limits.minValue),
      formatNumber(limits.maxValue),
      limits.unit ?? "",
    )
    .replace(" .", ".");
}

/** Valore decimale scritto dal cliente (circonferenze), con la virgola o il punto. */
export function decimalValueSchema(limits: MetricLimits) {
  return z
    .string(v.valueRequired)
    .trim()
    .min(1, v.valueRequired)
    .refine((raw) => DECIMAL_PATTERN.test(raw), v.valueNumber)
    .refine(
      (raw) =>
        (DECIMAL_PATTERN.exec(raw)?.[1]?.length ?? 0) <= MEASURE_DECIMALS,
      v.valueDecimals,
    )
    .transform((raw) => parseDecimalInput(raw)!)
    .refine(
      (value) => value >= limits.minValue && value <= limits.maxValue,
      rangeMessage(limits),
    );
}

/** Voto intero tra i limiti della misura (1–5 abitudini, 1–10 allenamenti). */
export function scoreSchema(limits: MetricLimits) {
  return z
    .number(v.scoreRequired)
    .int(v.scoreRequired)
    .min(limits.minValue, v.scoreRequired)
    .max(limits.maxValue, v.scoreRequired);
}

/** Form della circonferenza (C10): valore come testo, data. */
export function circumferenceFormSchema(limits: MetricLimits) {
  return z.object({
    value: decimalValueSchema(limits),
    recordedOn: recordedOnSchema,
  });
}
export type CircumferenceFormValues = { value: string; recordedOn: string };

/** Form dell'allenamento (C11): voto 1–10, data, nota facoltativa. */
export function workoutFormSchema(limits: MetricLimits) {
  return z.object({
    value: scoreSchema(limits),
    recordedOn: recordedOnSchema,
    note: noteSchema,
  });
}
export type WorkoutFormValues = {
  value: number | null;
  recordedOn: string;
  note: string;
};

/** Correzione del voto di un'abitudine: il giorno non cambia (un valore al giorno). */
export function habitValueSchema(limits: MetricLimits) {
  return z.object({ value: scoreSchema(limits) });
}

/** Valori normalizzati di una registrazione, per qualsiasi tipo di misura. */
export type EntryValues = {
  value: number;
  /** Assente nella correzione di un'abitudine. */
  recordedOn?: string;
  note: string | null;
};

/** Schema dei valori di una registrazione in base al tipo di misura. */
export function entryValuesSchema(
  limits: MetricLimits,
): z.ZodType<EntryValues, unknown> {
  switch (limits.kind) {
    case "circumference":
      return circumferenceFormSchema(limits).transform((data) => ({
        ...data,
        note: null,
      }));
    case "workout":
      return workoutFormSchema(limits);
    case "habit":
      return habitValueSchema(limits).transform((data) => ({
        ...data,
        note: null,
      }));
  }
}

const entryValuesInput = z.record(z.string(), z.unknown());

/** Nuova registrazione (circonferenza o allenamento): i valori si validano poi con la misura. */
export const addEntrySchema = z.object({
  metricId: z.uuid(),
  values: entryValuesInput,
});
export type AddEntryInput = z.input<typeof addEntrySchema>;

/** Correzione di una registrazione esistente. */
export const updateEntrySchema = z.object({
  entryId: z.uuid(),
  values: entryValuesInput,
});
export type UpdateEntryInput = z.input<typeof updateEntrySchema>;

export const entryIdSchema = z.object({ entryId: z.uuid() });
export type EntryIdInput = z.input<typeof entryIdSchema>;

/** Chiave di una misura nell'URL del dettaglio (stesso formato del database). */
export const metricKeySchema = z.string().regex(/^[a-z0-9_]{2,40}$/);

/** Check-in giornaliero (T-06): da 1 a 3 voti, oggi o ieri. */
export const checkinSchema = z.object({
  day: z.enum(CHECKIN_DAYS),
  values: z
    .record(
      metricKeySchema,
      z.number().int().min(HABIT_SCORE_RANGE.min).max(HABIT_SCORE_RANGE.max),
    )
    .refine((values) => Object.keys(values).length > 0, v.checkinEmpty),
});
export type CheckinInput = z.input<typeof checkinSchema>;

/** Parametro `?giorno=` del check-in: "ieri" o, in ogni altro caso, oggi. */
export const checkinDayParamSchema = z
  .unknown()
  .transform((value) =>
    value === CHECKIN_DAY_SLUGS.yesterday ? "yesterday" : "today",
  );

/**
 * Obiettivo personale scritto dallo staff (T-07): "2,5" litri, "8000" o
 * "8.000" passi, "7,5" ore; entro i limiti di HABIT_GOAL_LIMITS e sul loro passo.
 */
export function parseGoalInput(key: HabitKey, raw: string): number | null {
  const text = raw.trim();
  if (key === "steps") {
    // per i passi il punto è il separatore delle migliaia
    return /^\d{1,3}(?:\.\d{3})*$|^\d+$/.test(text)
      ? Number(text.replaceAll(".", ""))
      : null;
  }
  return parseDecimalInput(text);
}

function isOnStep(value: number, step: number): boolean {
  const steps = value / step;
  return Math.abs(steps - Math.round(steps)) < 1e-6;
}

export function goalValueSchema(key: HabitKey) {
  const limits = HABIT_GOAL_LIMITS[key];
  const message = v.goalRange(
    formatNumber(limits.min),
    formatNumber(limits.max),
  );
  return z
    .string(v.valueRequired)
    .trim()
    .min(1, v.valueRequired)
    .transform((raw, ctx) => {
      const value = parseGoalInput(key, raw);
      if (value === null) {
        ctx.addIssue({ code: "custom", message: v.valueNumber });
        return z.NEVER;
      }
      return value;
    })
    .refine((value) => value >= limits.min && value <= limits.max, message)
    .refine(
      (value) => isOnStep(value, limits.step),
      v.goalStep(formatNumber(limits.step)),
    );
}

/** Form degli obiettivi: un campo per abitudine (assente se lo studio non ha la misura). */
export const goalsFormSchema = z.object(
  Object.fromEntries(
    HABIT_KEYS.map((key) => [key, goalValueSchema(key).optional()]),
  ) as Record<HabitKey, z.ZodOptional<ReturnType<typeof goalValueSchema>>>,
);
export type GoalsFormValues = Partial<Record<HabitKey, string>>;

export const saveGoalsSchema = z.object({
  clientId: z.uuid(),
  goals: goalsFormSchema,
});
export type SaveGoalsInput = z.input<typeof saveGoalsSchema>;

export const resetGoalSchema = z.object({
  clientId: z.uuid(),
  key: z.enum(HABIT_KEYS),
});
export type ResetGoalInput = z.input<typeof resetGoalSchema>;
