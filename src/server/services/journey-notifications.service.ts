import "server-only";

import { after } from "next/server";

import {
  DAILY_REMINDER_CONCURRENCY,
  JOURNEY_CLIENT_PATH,
  NOTIFICATION_ICON_URL,
  PUSH_TTL_JOURNEY_SECONDS,
  ROUTES,
  type JourneySessionType,
  type PhotoView,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import {
  reminderSlot,
  isReminderDue,
  type ReminderKind,
} from "@/lib/domain/journeys/reminders";
import { sessionNames, type SessionName } from "@/lib/domain/journeys/sessions";
import { todayInRome } from "@/lib/domain/tracking/dates";
import { formatLongDate } from "@/lib/format";
import type { NotificationPayload } from "@/lib/notifications/catalog";
import {
  isPhotoReminderHour,
  photoReminderMoment,
} from "@/lib/photos/reminders";
import { isValidTimeZone, localDateTime } from "@/lib/notifications/schedule";
import { weekdayText, callDayText } from "@/lib/onboarding-prep/labels";
import {
  prepReminderKind,
  prepReminderWindow,
  prepDeadline,
} from "@/lib/onboarding-prep/reminders";
import * as journeysRepository from "@/server/repositories/journeys.repository";
import * as notificationsRepository from "@/server/repositories/notifications.repository";
import * as prepRepository from "@/server/repositories/onboarding-prep.repository";
import * as photosRepository from "@/server/repositories/photos.repository";
import * as pushService from "@/server/services/push.service";

/*
 * Push del percorso (C21): cambio di data o ora subito, promemoria la sera
 * prima e la mattina stessa. Le foto hanno un promemoria ogni mattina dal
 * giorno di apertura del set (C27); il giorno della sessione prende il posto
 * di quello del percorso. Solo Web Push (N-08). Ogni notifica passa da
 * journey_notifications con un vincolo unico (sessione, tipo, data, ora):
 * la riga si crea prima dell'invio e chi non la crea non invia, quindi due
 * esecuzioni del cron o due salvataggi uguali non mandano due push.
 * Senza account o dispositivi l'esito è "not_delivered" e non si fallisce.
 * Testi senza dati sanitari: solo nome della sessione, data e ora (N-05).
 */

const t = copy.journeys;

function sessionLabel(name: SessionName): string {
  if (name.kind === "onboarding") return t.sessionName.onboarding;
  if (name.kind === "gift") return t.sessionName.gift;
  return t.sessionName.check(name.number);
}

function shortTime(time: string | null): string | null {
  return time ? time.slice(0, 5) : null;
}

/**
 * Il service worker usa `type` solo per il badge di Android: quello del
 * check-in (ClipboardCheck) va bene anche per i check del percorso, senza
 * toccare il catalogo delle notifiche.
 */
function payload(
  sessionId: string,
  title: string,
  body: string,
): NotificationPayload {
  return {
    type: "daily_checkin",
    title,
    body,
    icon: NOTIFICATION_ICON_URL,
    url: JOURNEY_CLIENT_PATH,
    tag: `journey-${sessionId}`,
  };
}

type Job = {
  logId: string;
  userId: string | null;
  payload: NotificationPayload;
};

async function deliver(job: Job): Promise<void> {
  try {
    if (!job.userId) {
      await journeysRepository.completeNotification(job.logId, "not_delivered");
      return;
    }
    const outcome = await pushService.sendToUser(
      job.userId,
      job.payload,
      PUSH_TTL_JOURNEY_SECONDS,
    );
    if (outcome.status === "skipped") {
      await journeysRepository.completeNotification(
        job.logId,
        outcome.reason === "no_devices" ? "not_delivered" : "failed",
        outcome.reason,
      );
      return;
    }
    await journeysRepository.completeNotification(
      job.logId,
      outcome.status,
      outcome.status === "failed" ? `devices:${outcome.failed}` : null,
    );
  } catch (error) {
    console.error("[percorso] invio non riuscito", {
      logId: job.logId,
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}

async function deliverAll(jobs: Job[]): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next]!;
      next += 1;
      await deliver(job);
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(DAILY_REMINDER_CONCURRENCY, jobs.length) },
      worker,
    ),
  );
}

// ---------------------------------------------------------------------
// Cambio di data o ora
// ---------------------------------------------------------------------

/** Dopo la risposta (`after`): il salvataggio non aspetta il servizio push. */
export function notifySessionsChanged(sessionIds: readonly string[]) {
  if (sessionIds.length === 0) return;
  const ids = [...sessionIds];
  after(() => deliverDateChanges(ids));
}

/** Avvisi di cambio data; non lancia mai. */
export async function deliverDateChanges(
  sessionIds: readonly string[],
): Promise<void> {
  const today = todayInRome();
  const jobs: Job[] = [];
  for (const sessionId of sessionIds) {
    try {
      const target =
        await journeysRepository.getSessionNotificationTarget(sessionId);
      if (!target || target.client_journeys.status !== "active") continue;
      if (target.status !== "todo") continue;
      const date = target.custom_date ?? target.calculated_date;
      if (date < today) continue;
      const time = shortTime(target.session_time);
      const names = sessionNames(
        target.client_journeys.journey_sessions.map((session) => ({
          id: session.id,
          position: session.position,
          type: session.type as JourneySessionType,
        })),
        "client",
      );
      const name = sessionLabel(names.get(sessionId)!);
      const [entry] = await journeysRepository.insertNotifications([
        {
          sessionId,
          studioId: target.studio_id,
          clientId: target.client_id,
          kind: "date_changed",
          referenceDate: date,
          referenceTime: time,
        },
      ]);
      if (!entry) continue;
      const active = target.clients.account_status === "active";
      jobs.push({
        logId: entry.id,
        userId: active ? target.clients.user_id : null,
        payload: payload(
          sessionId,
          name === t.sessionName.onboarding
            ? t.push.dateChangedOnboardingTitle
            : t.push.dateChangedTitle,
          t.push.dateChanged(name, formatLongDate(date), time),
        ),
      });
    } catch (error) {
      console.error("[percorso] avviso del cambio di data non riuscito", {
        sessionId,
        error: error instanceof Error ? error.name : "unknown",
      });
    }
  }
  await deliverAll(jobs);
}

// ---------------------------------------------------------------------
// Promemoria (cron orario)
// ---------------------------------------------------------------------

export type JourneyReminderReport = {
  studios: number;
  queued: number;
  duplicates: number;
};

function reminderPayload(
  sessionId: string,
  kind: ReminderKind,
  name: string,
  time: string | null,
  staff: string | null,
): NotificationPayload {
  return kind === "reminder_day_before"
    ? payload(
        sessionId,
        t.push.dayBeforeTitle(name),
        t.push.dayBefore(time, staff ? t.push.withStaff(staff) : null),
      )
    : payload(sessionId, t.push.sameDayTitle(name), t.push.sameDay(time));
}

// ---------------------------------------------------------------------
// Promemoria delle foto (C27)
// ---------------------------------------------------------------------

function photoPayload(
  sessionId: string,
  title: string,
  body: string,
): NotificationPayload {
  return {
    type: "daily_checkin",
    title,
    body,
    icon: NOTIFICATION_ICON_URL,
    url: ROUTES.client.photos,
    tag: `photos-${sessionId}`,
  };
}

/**
 * Promemoria delle foto (C27): alle 8 un promemoria al giorno per ogni set
 * aperto (da 3 giorni prima della sessione) e non salvato. Stesso registro
 * e stessa deduplicazione dei promemoria del percorso (una riga per
 * sessione e giorno). Restituisce le sessioni di oggi con le foto, che non
 * ricevono il promemoria normale del mattino.
 */
async function preparePhotoReminders(
  studioId: string,
  local: { day: string; hour: number },
  report: JourneyReminderReport,
): Promise<{ jobs: Job[]; sameDaySessions: Set<string> }> {
  const jobs: Job[] = [];
  const sameDaySessions = new Set<string>();
  if (!isPhotoReminderHour(local.hour)) return { jobs, sameDaySessions };
  const p = copy.photos;
  const candidates = await photosRepository.listReminderCandidates(
    studioId,
    local.day,
  );
  for (const c of candidates) {
    if (c.session_date === local.day) sameDaySessions.add(c.session_id);
  }
  const inserted = new Map(
    (
      await journeysRepository.insertNotifications(
        candidates.map((candidate) => ({
          sessionId: candidate.session_id,
          studioId,
          clientId: candidate.client_id,
          kind: "photos_daily" as const,
          referenceDate: local.day,
          referenceTime: null,
        })),
      )
    ).map((row) => [row.sessionId, row.id]),
  );
  for (const candidate of candidates) {
    const logId = inserted.get(candidate.session_id);
    if (!logId) {
      report.duplicates += 1;
      continue;
    }
    report.queued += 1;
    const name =
      candidate.check_number === null
        ? t.sessionName.onboarding
        : p.checkName(candidate.check_number);
    const missing = (candidate.missing_views as PhotoView[]).map(
      (view) => p.views[view],
    );
    const progress = p.push.progress(candidate.photo_count, missing);
    const moment = photoReminderMoment(candidate.session_date, local.day);
    const [title, body] =
      moment === "same_day"
        ? [
            p.push.sameDayTitle(name),
            candidate.photo_count === 0
              ? p.push.sameDay(shortTime(candidate.session_time))
              : progress,
          ]
        : moment === "before"
          ? [p.push.beforeTitle(name), progress]
          : [p.push.afterTitle(name), progress];
    jobs.push({
      logId,
      userId: candidate.user_id,
      payload: photoPayload(candidate.session_id, title, body),
    });
  }
  return { jobs, sameDaySessions };
}

// ---------------------------------------------------------------------
// Preparazione della chiamata di onboarding (C32)
// ---------------------------------------------------------------------

function prepPayload(
  sessionId: string,
  title: string,
  body: string,
): NotificationPayload {
  return {
    type: "daily_checkin",
    title,
    body,
    icon: NOTIFICATION_ICON_URL,
    url: ROUTES.client.prep,
    tag: `prep-${sessionId}`,
  };
}

type Missing = "measures" | "photos" | "both";

function missingOf(measures: boolean, photos: boolean): Missing {
  return measures && photos ? "both" : measures ? "measures" : "photos";
}

/**
 * Promemoria della preparazione: alle 18, 2 giorni e 1 giorno prima della
 * chiamata, solo se manca qualcosa (il testo dice cosa). Restituisce le
 * chiamate di domani avvisate: il loro promemoria serale del percorso non
 * parte (una sola push).
 */
async function preparePrepReminders(
  studioId: string,
  local: { day: string; hour: number },
  report: JourneyReminderReport,
): Promise<{ jobs: Job[]; dayBeforeSessions: Set<string> }> {
  const jobs: Job[] = [];
  const dayBeforeSessions = new Set<string>();
  const window = prepReminderWindow(local);
  if (!window) return { jobs, dayBeforeSessions };
  const p = copy.onboardingPrep.push;
  const candidates = (
    await prepRepository.listReminderCandidates(
      studioId,
      window.from,
      window.to,
    )
  ).flatMap((candidate) => {
    const kind = prepReminderKind(candidate.call_date, local.day);
    return kind ? [{ ...candidate, kind }] : [];
  });
  for (const c of candidates) {
    if (c.kind === "prep_1d") dayBeforeSessions.add(c.session_id);
  }
  const inserted = new Map(
    (
      await journeysRepository.insertNotifications(
        candidates.map((candidate) => ({
          sessionId: candidate.session_id,
          studioId,
          clientId: candidate.client_id,
          kind: candidate.kind,
          referenceDate: candidate.call_date,
          referenceTime: null,
        })),
      )
    ).map((row) => [row.sessionId, row.id]),
  );
  for (const candidate of candidates) {
    const logId = inserted.get(candidate.session_id);
    if (!logId) {
      report.duplicates += 1;
      continue;
    }
    report.queued += 1;
    const missing = missingOf(
      candidate.measures_missing,
      candidate.photos_missing,
    );
    const [title, body] =
      candidate.kind === "prep_2d"
        ? [
            p.twoDaysTitle(p.missing[missing]),
            p.twoDays(
              weekdayText(candidate.call_date),
              weekdayText(prepDeadline(candidate.call_date)),
            ),
          ]
        : [p.lastTitle, p.last(p.missingShort[missing])];
    jobs.push({
      logId,
      userId: candidate.user_id,
      payload: prepPayload(candidate.session_id, title, body),
    });
  }
  return { jobs, dayBeforeSessions };
}

/**
 * Presentazione della preparazione (C32), una sola volta per data della
 * chiamata: parte quando il cliente in Onboarding attiva le notifiche (al
 * momento dell'attivazione dell'account il telefono non è ancora
 * registrato). Dopo la risposta; non lancia mai.
 */
export function notifyPrepIntro(target: {
  sessionId: string;
  studioId: string;
  clientId: string;
  userId: string;
  callDate: string;
}) {
  after(async () => {
    try {
      const [entry] = await journeysRepository.insertNotifications([
        {
          sessionId: target.sessionId,
          studioId: target.studioId,
          clientId: target.clientId,
          kind: "prep_intro",
          referenceDate: target.callDate,
          referenceTime: null,
        },
      ]);
      if (!entry) return;
      const p = copy.onboardingPrep.push;
      await deliverAll([
        {
          logId: entry.id,
          userId: target.userId,
          payload: prepPayload(
            target.sessionId,
            p.introTitle,
            p.intro(callDayText(target.callDate).toLocaleLowerCase("it-IT")),
          ),
        },
      ]);
    } catch (error) {
      console.error("[preparazione] presentazione non riuscita", {
        clientId: target.clientId,
        error: error instanceof Error ? error.name : "unknown",
      });
    }
  });
}

/**
 * Prima parte, veloce: studi all'ora di un promemoria nel proprio fuso,
 * sessioni da fare del giorno giusto, righe del registro. Restituisce solo
 * gli invii con una riga nuova.
 */
export async function prepareJourneyReminders(
  now: Date,
): Promise<{ report: JourneyReminderReport; jobs: Job[] }> {
  const report: JourneyReminderReport = {
    studios: 0,
    queued: 0,
    duplicates: 0,
  };
  const jobs: Job[] = [];
  const studios = await notificationsRepository.listStudios();
  for (const studio of studios) {
    if (!isValidTimeZone(studio.timezone)) continue;
    const local = localDateTime(now, studio.timezone);
    // Preparazione della chiamata (C32): il giorno prima sostituisce il
    // promemoria serale della sessione di onboarding
    const prep = await preparePrepReminders(studio.id, local, report);
    jobs.push(...prep.jobs);
    const slot = reminderSlot(local);
    if (!slot) continue;
    report.studios += 1;

    // Foto (C27): il giorno del check la loro push sostituisce quella del mattino
    const photos = await preparePhotoReminders(studio.id, local, report);
    jobs.push(...photos.jobs);

    const candidates = (
      await journeysRepository.listReminderCandidates(
        studio.id,
        slot.sessionDay,
      )
    )
      .filter(
        (candidate) =>
          !(
            (slot.kind === "reminder_same_day" &&
              photos.sameDaySessions.has(candidate.session_id)) ||
            (slot.kind === "reminder_day_before" &&
              prep.dayBeforeSessions.has(candidate.session_id))
          ),
      )
      .filter((candidate) =>
        isReminderDue(
          {
            date: candidate.session_date,
            time: shortTime(candidate.session_time),
          },
          slot,
        ),
      );
    const inserted = new Map(
      (
        await journeysRepository.insertNotifications(
          candidates.map((candidate) => ({
            sessionId: candidate.session_id,
            studioId: studio.id,
            clientId: candidate.client_id,
            kind: slot.kind,
            referenceDate: candidate.session_date,
            referenceTime: shortTime(candidate.session_time),
          })),
        )
      ).map((row) => [row.sessionId, row.id]),
    );
    for (const candidate of candidates) {
      const logId = inserted.get(candidate.session_id);
      if (!logId) {
        report.duplicates += 1;
        continue;
      }
      report.queued += 1;
      const name =
        candidate.type === "onboarding"
          ? t.sessionName.onboarding
          : t.sessionName.check(candidate.check_number ?? 1);
      jobs.push({
        logId,
        userId: candidate.user_id,
        payload: reminderPayload(
          candidate.session_id,
          slot.kind,
          name,
          shortTime(candidate.session_time),
          candidate.staff_name,
        ),
      });
    }
  }
  return { report, jobs };
}

/** Promemoria (cron): conteggi subito, invii dopo la risposta. */
export async function sendJourneyReminders(
  now: Date = new Date(),
): Promise<JourneyReminderReport> {
  const { report, jobs } = await prepareJourneyReminders(now);
  if (jobs.length > 0) after(() => deliverAll(jobs));
  console.info("[promemoria-percorso]", report);
  return report;
}
