/**
 * Percorso (A17, A18): input delle Server Actions e dei form, condivisi tra
 * browser e server (DEV-09). Le date sono giorni "YYYY-MM-DD", l'ora "HH:MM".
 */
import { z } from "zod";

import {
  JOURNEY_DURATIONS,
  JOURNEY_GIFT_MODES,
  JOURNEY_NOTE_MAX,
  JOURNEY_SESSION_STATUSES,
  MEET_URL_PATTERN,
  type JourneyDuration,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { addDays, todayInRome } from "@/lib/domain/tracking/dates";

const e = copy.journeys.admin.errors;

/** Date entro due anni da oggi, in entrambe le direzioni (percorsi già iniziati). */
const DATE_RANGE_DAYS = 730;

export const journeyDateSchema = z.iso.date(e.dateRequired).refine((day) => {
  const today = todayInRome();
  return (
    day >= addDays(today, -DATE_RANGE_DAYS) &&
    day <= addDays(today, DATE_RANGE_DAYS)
  );
}, e.dateRange);

/** "" = nessuna ora. */
export const sessionTimeSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value), {
    message: e.timeInvalid,
  })
  .transform((value) => value || null);

export const durationSchema = z
  .union([z.literal(6), z.literal(12)])
  .refine((value): value is JourneyDuration =>
    (JOURNEY_DURATIONS as readonly number[]).includes(value),
  );

export const createJourneySchema = z.object({
  clientId: z.uuid(),
  previousJourneyId: z.uuid().nullable(),
  durationMonths: durationSchema,
  startDate: journeyDateSchema,
  includeOnboarding: z.boolean(),
  giftMode: z.enum(JOURNEY_GIFT_MODES),
});
export type CreateJourneyInput = z.input<typeof createJourneySchema>;

export const updateJourneySchema = z.object({
  journeyId: z.uuid(),
  durationMonths: durationSchema,
  startDate: journeyDateSchema,
});
export type UpdateJourneyInput = z.input<typeof updateJourneySchema>;

export const sessionFormSchema = z.object({
  date: journeyDateSchema,
  time: sessionTimeSchema,
  status: z.enum(JOURNEY_SESSION_STATUSES),
  note: z
    .string()
    .trim()
    .max(JOURNEY_NOTE_MAX, e.noteTooLong)
    .transform((value) => value || null),
});
export type SessionFormValues = z.input<typeof sessionFormSchema>;

export const updateSessionSchema = sessionFormSchema.extend({
  sessionId: z.uuid(),
});
export type UpdateSessionInput = z.input<typeof updateSessionSchema>;

export const sessionIdSchema = z.object({ sessionId: z.uuid() });
export type SessionIdInput = z.input<typeof sessionIdSchema>;

/**
 * Link Google Meet (A17): solo https://meet.google.com/abc-defg-hij, senza
 * parametri né altri host. Spazi ai lati tolti; nient'altro viene corretto.
 */
export const meetingUrlSchema = z
  .string()
  .trim()
  .regex(MEET_URL_PATTERN, e.meetingUrlInvalid);

/** Link Meet di un check: vuoto o null = nessun link. */
export const setSessionMeetingSchema = z.object({
  sessionId: z.uuid(),
  meetingUrl: z
    .string()
    .trim()
    .refine((value) => value === "" || MEET_URL_PATTERN.test(value), {
      message: e.meetingUrlInvalid,
    })
    .transform((value) => value || null)
    .nullable(),
});
export type SetSessionMeetingInput = z.input<typeof setSessionMeetingSchema>;

/** `?percorso=` dello storico: un uuid, altrimenti il percorso corrente. */
export const journeyParamSchema = z.uuid().optional().catch(undefined);
