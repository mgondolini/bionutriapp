import { isAuthorizedCronRequest } from "@/lib/cron/authorize";
import {
  sendDailyReminders,
  sendMeasureCheckReminders,
} from "@/server/services/notifications.service";

/**
 * Promemoria orari, chiamati ogni ora (minuto 0) da pg_cron
 * con pg_net (migrazione 20261106000000_notifiche.sql). Senza
 * `Authorization: Bearer <CRON_SECRET>` risponde 401 e non fa nulla. Il
 * check-in serale va agli studi che sono alle 20 nel proprio fuso, il check
 * delle misure a quelli che sono alle 6 (giorno prima e giorno stesso). Il
 * percorso resta "daily-checkin" per non cambiare il job. Risponde subito con i
 * conteggi e invia dopo la risposta. Idempotente: il registro delle notifiche
 * impedisce un secondo invio nello stesso giorno.
 */
export async function POST(request: Request) {
  if (
    !isAuthorizedCronRequest(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    return Response.json(
      { ok: false },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const report = await sendDailyReminders();
    const measureCheck = await sendMeasureCheckReminders();
    return Response.json(
      { ok: true, ...report, measureCheck },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[promemoria] esecuzione non riuscita", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return Response.json(
      { ok: false },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
