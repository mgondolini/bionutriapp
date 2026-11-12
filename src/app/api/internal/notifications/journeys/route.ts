import { isAuthorizedCronRequest } from "@/lib/cron/authorize";
import { sendJourneyReminders } from "@/server/services/journey-notifications.service";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * Promemoria del percorso (C21), chiamato ogni ora (minuto 0) da pg_cron con
 * pg_net (migrazione 20261113000000_percorsi.sql). Senza
 * `Authorization: Bearer <CRON_SECRET>` risponde 401 e non fa nulla. Alle 18
 * nel fuso dello studio avvisa delle sessioni di domani, alle 8 di quelle di
 * oggi; risponde subito con i conteggi e invia dopo la risposta.
 * Idempotente: journey_notifications impedisce un secondo invio.
 */
export async function POST(request: Request) {
  if (
    !isAuthorizedCronRequest(
      request.headers.get("authorization"),
      process.env.CRON_SECRET,
    )
  ) {
    return Response.json({ ok: false }, { status: 401, headers: NO_STORE });
  }
  try {
    const report = await sendJourneyReminders();
    return Response.json({ ok: true, ...report }, { headers: NO_STORE });
  } catch (error) {
    console.error("[promemoria-percorso] esecuzione non riuscita", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return Response.json({ ok: false }, { status: 500, headers: NO_STORE });
  }
}
