// Schemi Zod condivisi tra form (client) e Server Actions: niente "server-only".
// I limiti di ogni misura vengono dal database (metrics), come nel Tracking
// (T-02, T-04): lo stesso schema nel form e nel service; il trigger
// validate_tracking_entry resta l'ultimo controllo.
import { z } from "zod";

import {
  decimalValueSchema,
  metricKeySchema,
  recordedOnSchema,
  type MetricLimits,
} from "@/server/validation/tracking.schema";
import {
  journeyDateSchema,
  sessionTimeSchema,
} from "@/server/validation/journeys.schema";

/** Form delle misure di partenza (C29): un campo per misura, più la data. */
export function prepMeasuresFormSchema(
  metrics: readonly { key: string; limits: MetricLimits }[],
) {
  return z.object({
    recordedOn: recordedOnSchema,
    values: z.object(
      Object.fromEntries(
        metrics.map((metric) => [
          metric.key,
          decimalValueSchema(metric.limits),
        ]),
      ),
    ),
  });
}

export type PrepMeasuresFormValues = {
  recordedOn: string;
  values: Record<string, string>;
};

/** Forma dell'input della Server Action; i valori li rivalida il service. */
export const saveMeasuresSchema = z.object({
  recordedOn: z.string(),
  values: z.record(metricKeySchema, z.string().max(20)),
});
export type SaveMeasuresInput = z.input<typeof saveMeasuresSchema>;

/** Data e ora della chiamata di onboarding (A5): la sessione di onboarding. */
export const callFormSchema = z.object({
  date: journeyDateSchema,
  time: sessionTimeSchema,
});
export type CallFormValues = z.input<typeof callFormSchema>;

export const setCallSchema = callFormSchema.extend({ clientId: z.uuid() });
export type SetCallInput = z.input<typeof setCallSchema>;
