import "server-only";

import { after } from "next/server";

import {
  buildNotification,
  type NotificationEvent,
} from "@/lib/notifications/payload";
import * as pushService from "@/server/services/push.service";

export type { NotificationEvent } from "@/lib/notifications/payload";

/*
 * Unico punto di invio delle notifiche ai clienti (N-06): chi pubblica un
 * file chiama solo notifyClient, così il canale (oggi Web Push, in futuro
 * anche l'email) cambia senza toccare il resto. Nessuna email nella 1.0 (N-08).
 */

/**
 * Invia la notifica dopo la risposta all'utente (`after`): la pubblicazione
 * del file non aspetta il servizio push e non fallisce se l'invio fallisce.
 * Nei log solo id e tipo di evento: mai titoli, categorie o dati sulla salute.
 */
export function notifyClient(clientId: string, event: NotificationEvent) {
  after(() => deliver(clientId, event));
}

/** L'invio vero e proprio; non lancia mai. */
export async function deliver(
  clientId: string,
  event: NotificationEvent,
): Promise<void> {
  try {
    const outcome = await pushService.sendToClient(clientId, (studio) =>
      buildNotification(event, studio),
    );
    if (outcome.status === "skipped" && outcome.reason === "not_configured") {
      console.error("[notifiche] chiavi VAPID mancanti: push non inviata");
      return;
    }
    console.info("[notifiche]", { type: event.type, clientId, ...outcome });
  } catch (error) {
    console.error("[notifiche] invio non riuscito", {
      type: event.type,
      clientId,
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}
<<<<<<< Updated upstream
=======

/**
 * Nuovo file pubblicato: l'invio parte dopo la risposta (`after`), così il
 * caricamento non aspetta il servizio push e non fallisce mai per la notifica.
 */
export function notifyNewFile(fileId: string) {
  after(() => deliverNewFile(fileId));
}

/** L'invio dell'avviso di un file; non lancia mai. */
export async function deliverNewFile(fileId: string): Promise<void> {
  try {
    const recipient = await notificationsRepository.getFileRecipient(fileId);
    if (!recipient) return;
    const event: NotificationEvent = {
      type: "file",
      category: recipient.category,
      fileId,
    };
    const skip = fileSkipReason(recipient);
    const [entry] = await notificationsRepository.insertLogEntries([
      {
        studioId: recipient.studioId,
        clientId: recipient.clientId,
        userId: recipient.userId,
        type: notificationType(event),
        dedupeKey: dedupeKey(event, recipient.clientId),
        payload: logPayload(event),
        ...(skip
          ? { status: "skipped", skippedReason: skip }
          : { status: "queued" }),
      },
    ]);
    // già nel registro (conferma ripetuta) o da saltare: niente invio
    if (!entry || skip || !recipient.userId) return;
    await deliverQueued({
      logId: entry.id,
      clientId: recipient.clientId,
      userId: recipient.userId,
      studioName: recipient.studioName,
      event,
    });
  } catch (error) {
    console.error("[notifiche] avviso del file non riuscito", {
      fileId,
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}

/**
 * Nuovo video con "Avvisa i clienti" (mockup v4, A14): a tutti i clienti che
 * vedono la cartella, con un dispositivo e senza "Nuovi video" spento.
 * Dopo la risposta (`after`), a lotti: il salvataggio del video non aspetta.
 */
export function notifyNewVideo(videoId: string) {
  after(() => deliverNewVideo(videoId));
}

/** L'invio dell'avviso di un video; non lancia mai. */
export async function deliverNewVideo(videoId: string): Promise<void> {
  try {
    const target =
      await notificationsRepository.getVideoNotificationTarget(videoId);
    if (!target || target.recipients.length === 0) return;
    const event: NotificationEvent = {
      type: "video",
      videoId: target.videoId,
      folderId: target.folderId,
    };
    const entries: NewLogEntry[] = target.recipients.map((recipient) => ({
      studioId: target.studioId,
      clientId: recipient.clientId,
      userId: recipient.userId,
      type: "video",
      dedupeKey: dedupeKey(event, recipient.clientId),
      payload: logPayload(event),
      status: "queued",
    }));
    const inserted = new Map(
      (await notificationsRepository.insertLogEntries(entries)).map((row) => [
        row.dedupeKey,
        row.id,
      ]),
    );
    const jobs: QueuedNotification[] = target.recipients.flatMap(
      (recipient) => {
        const logId = inserted.get(dedupeKey(event, recipient.clientId));
        return logId
          ? [
              {
                logId,
                clientId: recipient.clientId,
                userId: recipient.userId,
                studioName: target.studioName,
                event,
              },
            ]
          : [];
      },
    );
    await deliverAll(jobs);
  } catch (error) {
    console.error("[notifiche] avviso del video non riuscito", {
      videoId,
      error: error instanceof Error ? error.name : "unknown",
    });
  }
}

export type DailyReminderReport = {
  studios: number;
  queued: number;
  skipped: number;
  duplicates: number;
};

/**
 * Prima parte del promemoria serale, veloce: studi alle 20 nel proprio fuso,
 * clienti idonei, righe del registro. Restituisce le notifiche da inviare
 * (solo quelle con una riga nuova: una seconda esecuzione nella stessa ora
 * non ne restituisce nessuna).
 */
export async function prepareDailyReminders(
  now: Date,
): Promise<{ report: DailyReminderReport; jobs: QueuedNotification[] }> {
  const report: DailyReminderReport = {
    studios: 0,
    queued: 0,
    skipped: 0,
    duplicates: 0,
  };
  const jobs: QueuedNotification[] = [];
  const studios = await notificationsRepository.listStudios();

  for (const studio of studios) {
    if (!isValidTimeZone(studio.timezone)) {
      console.error("[promemoria] fuso non valido", { studioId: studio.id });
      continue;
    }
    if (!isReminderHour(now, studio.timezone)) continue;
    report.studios += 1;

    const { day } = localDateTime(now, studio.timezone);
    const candidates =
      await notificationsRepository.listDailyReminderCandidates(studio.id, day);
    const planned = candidates.map((candidate) => {
      const decision = decideDailyReminder(candidate);
      const event: NotificationEvent = {
        type: "daily_checkin",
        day,
        variant: decision.send ? decision.variant : "base",
      };
      const entry: NewLogEntry = {
        studioId: studio.id,
        clientId: candidate.clientId,
        userId: candidate.userId,
        type: "daily_checkin",
        dedupeKey: dedupeKey(event, candidate.clientId),
        payload: logPayload(event),
        ...(decision.send
          ? { status: "queued" }
          : { status: "skipped", skippedReason: decision.reason }),
      };
      return { candidate, event, entry, send: decision.send };
    });

    const inserted = new Map(
      (
        await notificationsRepository.insertLogEntries(
          planned.map((p) => p.entry),
        )
      ).map((row) => [row.dedupeKey, row.id]),
    );
    for (const plan of planned) {
      const logId = inserted.get(plan.entry.dedupeKey);
      if (!logId) report.duplicates += 1;
      else if (!plan.send) report.skipped += 1;
      else {
        report.queued += 1;
        jobs.push({
          logId,
          clientId: plan.candidate.clientId,
          userId: plan.candidate.userId,
          studioName: studio.name,
          event: plan.event,
        });
      }
    }
  }
  return { report, jobs };
}

/** Seconda parte: gli invii, a lotti di DAILY_REMINDER_CONCURRENCY. */
export async function deliverAll(jobs: QueuedNotification[]): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next];
      next += 1;
      await deliverQueued(job);
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(DAILY_REMINDER_CONCURRENCY, jobs.length) },
      worker,
    ),
  );
}

/**
 * Promemoria serale (chiamato dal cron ogni ora): risponde subito con i
 * conteggi e invia dopo la risposta. Idempotente grazie al registro.
 */
export async function sendDailyReminders(
  now: Date = new Date(),
): Promise<DailyReminderReport> {
  const { report, jobs } = await prepareDailyReminders(now);
  if (jobs.length > 0) after(() => deliverAll(jobs));
  console.info("[promemoria]", report);
  return report;
}

/** Preferenze dell'utente della sessione (interruttori del profilo, C-07). */
export function getOwnPreferences(): Promise<NotificationPreferences> {
  return notificationsRepository.getOwnPreferences();
}

export async function setOwnPreference(
  userId: string,
  key: keyof NotificationPreferences,
  enabled: boolean,
): Promise<void> {
  const current = await notificationsRepository.getOwnPreferences();
  await notificationsRepository.saveOwnPreferences(userId, {
    ...current,
    [key]: enabled,
  });
}
>>>>>>> Stashed changes
