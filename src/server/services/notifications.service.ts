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
