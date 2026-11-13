/**
 * Stato mostrato di un set (DEV-13): si salva solo bozza o salvato, il
 * resto dipende dalla data del check e dalle foto caricate.
 */
import { addDays } from "@/lib/domain/tracking/dates";
import {
  PHOTO_SET_OPEN_DAYS_BEFORE,
  PHOTO_VIEWS,
  type JourneySessionStatus,
  type JourneyStage,
  type PhotoSetStatus,
  type PhotoView,
} from "@/lib/constants/domain";

/**
 * - future: mancano più di 3 giorni alla sessione ("Prossima", senza azioni);
 *   il set di partenza (onboarding) è aperto da subito: la preparazione
 *   della chiamata lo chiede prima della chiamata
 * - to_upload: aperto (da 3 giorni prima), nessuna foto
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
  /** Set di partenza: aperto da subito. */
  startSet?: boolean;
}): PhotoSetState {
  if (input.setStatus === "saved") return "saved";
  const count = new Set(input.views).size;
  if (count === 0) {
    if (!isPhotoSetOpen(input.sessionDate, input.today, input.startSet)) {
      return "future";
    }
    return input.sessionStatus === "skipped" ? "skipped" : "to_upload";
  }
  return count >= PHOTO_VIEWS.length ? "ready" : "draft";
}

/** Giorno di apertura del set: 3 giorni prima della sessione. */
export function photoSetOpensOn(sessionDate: string): string {
  return addDays(sessionDate, -PHOTO_SET_OPEN_DAYS_BEFORE);
}

export function isPhotoSetOpen(
  sessionDate: string,
  today: string,
  startSet = false,
): boolean {
  return startSet || photoSetOpensOn(sessionDate) <= today;
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

/** Fasi in cui il cliente carica e salva le foto (anche quelle di partenza). */
export function canClientUploadPhotos(stage: JourneyStage): boolean {
  return stage === "onboarding" || stage === "in_progress";
}

/** Set aperto (si può caricare): arrivato e non salvato. */
export function isOpenState(state: PhotoSetState): boolean {
  return state === "to_upload" || state === "draft" || state === "ready";
}
