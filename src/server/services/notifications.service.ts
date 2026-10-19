import "server-only";

/*
 * Unico punto di invio delle notifiche ai clienti (N-06): chi pubblica un
 * file chiama solo notifyClient, così il canale (Web Push nella fase 7,
 * eventualmente email in futuro) cambia senza toccare il resto. Nessuna
 * email nella 1.0 (N-08).
 */

export type NotificationEvent = { type: "file_published" };

/**
 * Per ora registra l'evento nei log del server. Nei log e nei messaggi solo
 * id e tipo di evento: mai titoli, categorie o altri dati sulla salute.
 */
export async function notifyClient(
  clientId: string,
  event: NotificationEvent,
): Promise<void> {
  console.info("[notifiche]", { type: event.type, clientId });
}
