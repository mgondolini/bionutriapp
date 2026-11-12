/**
 * Stato mostrato di un set (DEV-13): si salva solo bozza o salvato, il
 * resto dipende dalla data del check e dalle foto caricate.
 */
import {
  PHOTO_VIEWS,
  type JourneySessionStatus,
  type PhotoSetStatus,
  type PhotoView,
} from "@/lib/constants/domain";

/**
 * - future: il check non è ancora arrivato ("Prossima", senza azioni)
 * - to_upload: aperto, nessuna foto
 * - draft: 1 o 2 foto
 * - ready: tutte e tre, da salvare
 * - saved: definitivo
 * - skipped: check saltato senza foto (non si mostra)
 */
export type PhotoSetState =
  "future" | "to_upload" | "draft" | "ready" | "saved" | "skipped";

export function getPhotoSetStatus(input: {
  sessionDate: string;
  today: string;
  sessionStatus: JourneySessionStatus;
  setStatus: PhotoSetStatus | null;
  views: readonly PhotoView[];
}): PhotoSetState {
  if (input.setStatus === "saved") return "saved";
  const count = new Set(input.views).size;
  if (count === 0) {
    if (input.sessionDate > input.today) return "future";
    return input.sessionStatus === "skipped" ? "skipped" : "to_upload";
  }
  return count >= PHOTO_VIEWS.length ? "ready" : "draft";
}

/** Viste ancora da caricare, nell'ordine Fronte, Lato, Dietro. */
export function missingViews(views: readonly PhotoView[]): PhotoView[] {
  return PHOTO_VIEWS.filter((view) => !views.includes(view));
}

/** "Salva le foto" è attivo solo con tutte e tre le viste e il set non salvato. */
export function canSavePhotoSet(input: {
  setStatus: PhotoSetStatus | null;
  views: readonly PhotoView[];
}): boolean {
  return input.setStatus !== "saved" && missingViews(input.views).length === 0;
}

/** Set aperto (si può caricare): arrivato e non salvato. */
export function isOpenState(state: PhotoSetState): boolean {
  return state === "to_upload" || state === "draft" || state === "ready";
}
