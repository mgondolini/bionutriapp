import "server-only";

import {
  EXPIRED_INVITE_RETENTION_DAYS,
  ORPHAN_UPLOAD_MAX_AGE_HOURS,
  VIDEO_RECHECK_CONCURRENCY,
  VIDEO_RECHECK_LIMIT,
} from "@/lib/constants/domain";
import { oembedOutcome } from "@/lib/videos/youtube";
import * as maintenanceRepository from "@/server/repositories/maintenance.repository";
import * as youtubeRepository from "@/server/repositories/youtube.repository";

<<<<<<< Updated upstream
export type MaintenanceStep = "keepAlive" | "orphanUploads" | "expiredInvites";
=======
export type MaintenanceStep =
  | "keepAlive"
  | "orphanUploads"
  | "expiredInvites"
  | "notificationLog"
  | "videoAvailability";
>>>>>>> Stashed changes

export type MaintenanceReport = {
  ok: boolean;
  durationMs: number;
  orphanUploadsRemoved: number;
  expiredInvitesDeleted: number;
<<<<<<< Updated upstream
=======
  notificationLogDeleted: number;
  videosChecked: number;
  videosUnavailable: number;
>>>>>>> Stashed changes
  failed: MaintenanceStep[];
};

/**
 * Video della libreria ricontrollati con oEmbed (mockup v4, C17): un video
 * diventato privato, rimosso o non più incorporabile risulta "Non
 * disponibile" allo staff e al cliente; torna normale quando YouTube lo
 * riproduce di nuovo. Errori di rete o di YouTube non cambiano nulla.
 */
async function recheckVideos(): Promise<{
  checked: number;
  unavailable: number;
}> {
  const videos =
    await maintenanceRepository.listVideosToRecheck(VIDEO_RECHECK_LIMIT);
  let checked = 0;
  let unavailable = 0;
  let next = 0;
  const worker = async () => {
    while (next < videos.length) {
      const video = videos[next];
      next += 1;
      const response = await youtubeRepository.fetchOembed(video.youtubeId);
      if (response.status === "network_error") continue;
      const outcome = oembedOutcome(response.status);
      if (outcome === "check_failed") continue;
      await maintenanceRepository.saveVideoAvailability(
        video,
        outcome === "ok",
      );
      checked += 1;
      if (outcome !== "ok") unavailable += 1;
    }
  };
  await Promise.all(
    Array.from(
      { length: Math.min(VIDEO_RECHECK_CONCURRENCY, videos.length) },
      worker,
    ),
  );
  return { checked, unavailable };
}

/**
 * Manutenzione giornaliera (fase 9): ogni passaggio è indipendente, l'errore
 * di uno non ferma gli altri. Nei log solo conteggi, durata e nome dei
 * passaggi falliti: mai percorsi, id o dati personali.
 */
export async function runMaintenance(): Promise<MaintenanceReport> {
  const started = Date.now();
  const failed: MaintenanceStep[] = [];

  async function step<T>(
    name: MaintenanceStep,
    run: () => Promise<T>,
    fallback: T,
  ) {
    try {
      return await run();
    } catch (error) {
      failed.push(name);
      // solo codice e tipo dell'errore, mai il messaggio completo (può contenere percorsi)
      const code =
        error && typeof error === "object" && "code" in error
          ? String(error.code)
          : error instanceof Error
            ? error.name
            : "unknown";
      console.error(`[manutenzione] passaggio ${name} non riuscito (${code})`);
      return fallback;
    }
  }

  await step("keepAlive", maintenanceRepository.ping, undefined);
  const orphanUploadsRemoved = await step(
    "orphanUploads",
    async () =>
      maintenanceRepository.removeClientFileObjects(
        await maintenanceRepository.listOrphanUploads(
          ORPHAN_UPLOAD_MAX_AGE_HOURS,
        ),
      ),
    0,
  );
  const expiredInvitesDeleted = await step(
    "expiredInvites",
    () =>
      maintenanceRepository.purgeExpiredInvites(EXPIRED_INVITE_RETENTION_DAYS),
    0,
  );

<<<<<<< Updated upstream
=======
  const notificationLogDeleted = await step(
    "notificationLog",
    () =>
      maintenanceRepository.purgeNotificationLog(
        NOTIFICATION_LOG_RETENTION_DAYS,
      ),
    0,
  );

  const videos = await step("videoAvailability", recheckVideos, {
    checked: 0,
    unavailable: 0,
  });

>>>>>>> Stashed changes
  const report: MaintenanceReport = {
    ok: failed.length === 0,
    durationMs: Date.now() - started,
    orphanUploadsRemoved,
    expiredInvitesDeleted,
<<<<<<< Updated upstream
=======
    notificationLogDeleted,
    videosChecked: videos.checked,
    videosUnavailable: videos.unavailable,
>>>>>>> Stashed changes
    failed,
  };
  console.info(
    `[manutenzione] ${report.ok ? "completata" : "completata con errori"}: ` +
      `oggetti orfani eliminati ${orphanUploadsRemoved}, ` +
      `inviti scaduti eliminati ${expiredInvitesDeleted}, ` +
<<<<<<< Updated upstream
=======
      `notifiche eliminate dal registro ${notificationLogDeleted}, ` +
      `video controllati ${videos.checked} (non disponibili ${videos.unavailable}), ` +
>>>>>>> Stashed changes
      `durata ${report.durationMs} ms`,
  );
  return report;
}
