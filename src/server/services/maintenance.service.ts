import "server-only";

import {
  EXPIRED_INVITE_RETENTION_DAYS,
  NOTIFICATION_LOG_RETENTION_DAYS,
  ORPHAN_UPLOAD_MAX_AGE_HOURS,
} from "@/lib/constants/domain";
import * as maintenanceRepository from "@/server/repositories/maintenance.repository";

export type MaintenanceStep =
  "keepAlive" | "orphanUploads" | "expiredInvites" | "notificationLog";

export type MaintenanceReport = {
  ok: boolean;
  durationMs: number;
  orphanUploadsRemoved: number;
  expiredInvitesDeleted: number;
  notificationLogDeleted: number;
  failed: MaintenanceStep[];
};

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

  const notificationLogDeleted = await step(
    "notificationLog",
    () =>
      maintenanceRepository.purgeNotificationLog(
        NOTIFICATION_LOG_RETENTION_DAYS,
      ),
    0,
  );

  const report: MaintenanceReport = {
    ok: failed.length === 0,
    durationMs: Date.now() - started,
    orphanUploadsRemoved,
    expiredInvitesDeleted,
    notificationLogDeleted,
    failed,
  };
  console.info(
    `[manutenzione] ${report.ok ? "completata" : "completata con errori"}: ` +
      `oggetti orfani eliminati ${orphanUploadsRemoved}, ` +
      `inviti scaduti eliminati ${expiredInvitesDeleted}, ` +
      `notifiche eliminate dal registro ${notificationLogDeleted}, ` +
      `durata ${report.durationMs} ms`,
  );
  return report;
}
