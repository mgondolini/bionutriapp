import {
  NOTIFICATION_BADGES_PATH,
  NOTIFICATION_ICON_URL,
  PUSH_TTL_CHECKIN_SECONDS,
  PUSH_TTL_FILE_SECONDS,
  PUSH_TTL_MEASURE_CHECK_SECONDS,
  ROUTES,
  videoPath,
  type FileCategory,
  type NotificationType,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

/*
 * Catalogo delle notifiche (N-05, N-06): per ogni tipo il testo (da
 * `copy.notifications`), la pagina che apre, il tag e la chiave di
 * deduplicazione. Il titolo è sempre il nome dello studio. Gli eventi possono
 * portare con sé altri dati: qui non si leggono mai titoli, note o valori;
 * l'unico nome ammesso è quello della cartella video (libreria dello studio).
 */

/** "workout" = nessun allenamento registrato oggi: il testo lo ricorda. */
export type DailyCheckinVariant = "base" | "workout";

export type NotificationEvent =
  | { type: "file"; category: FileCategory; fileId: string }
  | { type: "daily_checkin"; day: string; variant: DailyCheckinVariant }
  | { type: "video"; videoId: string; folderId: string; folderName: string }
  /** Check delle misure: "eve" il giorno prima, "day" il giorno stesso. */
  | { type: "measure_check"; dueOn: string; when: "eve" | "day" };

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

type FileNotificationType = "file_diet" | "file_workout" | "file_report";

const FILE_TYPES: Record<FileCategory, FileNotificationType> = {
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
  video: ROUTES.client.videos,
  measure_check: ROUTES.client.tracking,
};

/** Pagina aperta dal tocco: per un video, direttamente il video. */
function notificationUrl(event: NotificationEvent): string {
  return event.type === "video"
    ? videoPath(event.folderId, event.videoId)
    : NOTIFICATION_URLS[notificationType(event)];
}

export function notificationType(event: NotificationEvent): NotificationType {
  if (event.type === "file") return FILE_TYPES[event.category];
  return event.type;
}

/**
 * Tag della notifica sul telefono: più file della stessa categoria
 * pubblicati di seguito si sostituiscono; una seconda esecuzione del
 * promemoria sostituirebbe la prima invece di duplicarla.
 */
export function notificationTag(event: NotificationEvent): string {
  switch (event.type) {
    case "file":
      return `files:${notificationType(event)}`;
    case "daily_checkin":
      return `checkin-${event.day}`;
    case "video":
      return "videos";
    case "measure_check":
      return `measure-check-${event.dueOn}`;
  }
}

/** Unica per notifica: un secondo invio con la stessa chiave non parte. */
export function dedupeKey(event: NotificationEvent, clientId: string): string {
  switch (event.type) {
    case "file":
      return `file:${event.fileId}`;
    case "daily_checkin":
      return `checkin:${clientId}:${event.day}`;
    case "video":
      return `video:${event.videoId}:${clientId}`;
    case "measure_check":
      return `measure_check:${clientId}:${event.dueOn}:${event.when}`;
  }
}

export function notificationTtl(event: NotificationEvent): number {
  if (event.type === "daily_checkin") return PUSH_TTL_CHECKIN_SECONDS;
  if (event.type === "measure_check") return PUSH_TTL_MEASURE_CHECK_SECONDS;
  return PUSH_TTL_FILE_SECONDS;
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
  return {
    type,
    title: studio.name,
    body: notificationBody(event),
    icon: NOTIFICATION_ICON_URL,
    url: notificationUrl(event),
    tag: notificationTag(event),
  };
}

function notificationBody(event: NotificationEvent): string {
  const t = copy.notifications.body;
  switch (event.type) {
    case "file":
      return t[FILE_TYPES[event.category] as FileNotificationType];
    case "daily_checkin":
      return event.variant === "workout"
        ? t.daily_checkin_workout
        : t.daily_checkin;
    case "video":
      return t.video(event.folderName);
    case "measure_check":
      return event.when === "eve" ? t.measure_check_eve : t.measure_check_day;
  }
}

/** Payload salvato nel registro: solo url, tag e riferimenti, mai testi. */
export function logPayload(event: NotificationEvent) {
  return {
    url: notificationUrl(event),
    tag: notificationTag(event),
    ...(event.type === "file"
      ? { fileId: event.fileId }
      : event.type === "video"
        ? { videoId: event.videoId }
        : event.type === "measure_check"
          ? { dueOn: event.dueOn, when: event.when }
          : { day: event.day }),
  };
}
