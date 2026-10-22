import {
  NOTIFICATION_ICON_URL,
  NOTIFICATION_TARGET_URL,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

/*
 * Contenuto delle notifiche (N-05): solo il nome dello studio, un testo
 * generico e il link all'area riservata. Mai titolo, categoria, nota o
 * altri dati del file: l'evento li può contenere, qui non si leggono.
 */

export type NotificationEvent = { type: "file_published" };

/** Ciò che il service worker riceve e mostra (`public/sw.js`). */
export type NotificationPayload = {
  title: string;
  body: string;
  icon: string;
  url: string;
  tag: string;
};

export function buildNotification(
  event: NotificationEvent,
  studio: { name: string },
): NotificationPayload {
  switch (event.type) {
    case "file_published":
      return {
        title: studio.name,
        body: copy.notifications.filePublished,
        icon: NOTIFICATION_ICON_URL,
        url: NOTIFICATION_TARGET_URL,
        // più file pubblicati di seguito: una sola notifica sul telefono
        tag: event.type,
      };
  }
}
