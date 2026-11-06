import {
  NOTIFICATION_BADGES_PATH,
  NOTIFICATION_ICON_URL,
  PUSH_TTL_CHECKIN_SECONDS,
  PUSH_TTL_FILE_SECONDS,
  ROUTES,
  type FileCategory,
  type NotificationType,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

/*
 * Catalogo delle notifiche (N-05, N-06): per ogni tipo il testo (da
 * `copy.notifications`), la pagina che apre, il tag e la chiave di
 * deduplicazione. Il titolo è sempre il nome dello studio. Gli eventi possono
 * portare con sé altri dati: qui non si leggono mai titoli, note o valori.
 */

/** "workout" = nessun allenamento registrato oggi: il testo lo ricorda. */
export type DailyCheckinVariant = "base" | "workout";

export type NotificationEvent =
  | { type: "file"; category: FileCategory; fileId: string }
  | { type: "daily_checkin"; day: string; variant: DailyCheckinVariant };

/** Ciò che il service worker riceve e mostra (`public/sw.js`). */
export type NotificationPayload = {
  type: NotificationType;
  title: string;
  body: string;
  icon: string;
  /** Percorso relativo dell'area cliente. */
  url: string;
  tag: string;
};

const FILE_TYPES: Record<FileCategory, NotificationType> = {
  diet: "file_diet",
  workout: "file_workout",
  report: "file_report",
};

/** Pagina aperta dal tocco: la categoria del file o il tracking. */
export const NOTIFICATION_URLS: Record<NotificationType, string> = {
  file_diet: ROUTES.client.diets,
  file_workout: ROUTES.client.workouts,
  file_report: ROUTES.client.reports,
  daily_checkin: ROUTES.client.tracking,
};

export function notificationType(event: NotificationEvent): NotificationType {
  return event.type === "file" ? FILE_TYPES[event.category] : "daily_checkin";
}

/**
 * Tag della notifica sul telefono: più file della stessa categoria
 * pubblicati di seguito si sostituiscono; una seconda esecuzione del
 * promemoria sostituirebbe la prima invece di duplicarla.
 */
export function notificationTag(event: NotificationEvent): string {
  return event.type === "file"
    ? `files:${notificationType(event)}`
    : `checkin-${event.day}`;
}

/** Unica per notifica: un secondo invio con la stessa chiave non parte. */
export function dedupeKey(event: NotificationEvent, clientId: string): string {
  return event.type === "file"
    ? `file:${event.fileId}`
    : `checkin:${clientId}:${event.day}`;
}

export function notificationTtl(event: NotificationEvent): number {
  return event.type === "file"
    ? PUSH_TTL_FILE_SECONDS
    : PUSH_TTL_CHECKIN_SECONDS;
}

/** Badge monocromatico di Android (generato da `pnpm notifications:badges`). */
export function badgeUrl(type: NotificationType): string {
  return `${NOTIFICATION_BADGES_PATH}/${type}.png`;
}

export function buildNotification(
  event: NotificationEvent,
  studio: { name: string },
): NotificationPayload {
  const type = notificationType(event);
  const t = copy.notifications.body;
  const body =
    event.type === "daily_checkin"
      ? event.variant === "workout"
        ? t.daily_checkin_workout
        : t.daily_checkin
      : t[type];
  return {
    type,
    title: studio.name,
    body,
    icon: NOTIFICATION_ICON_URL,
    url: NOTIFICATION_URLS[type],
    tag: notificationTag(event),
  };
}

/** Payload salvato nel registro: solo url, tag e riferimenti, mai testi. */
export function logPayload(event: NotificationEvent) {
  return {
    url: NOTIFICATION_URLS[notificationType(event)],
    tag: notificationTag(event),
    ...(event.type === "file" ? { fileId: event.fileId } : { day: event.day }),
  };
}
