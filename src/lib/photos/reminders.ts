/**
 * Promemoria delle foto (C27, decisione del 13 novembre 2026): uno al
 * giorno alle 8 nel fuso dello studio, dall'apertura del set (3 giorni
 * prima della sessione) fino al salvataggio. Il giorno della sessione
 * prende il posto del promemoria del mattino del percorso (DEV-10).
 */
import { JOURNEY_REMINDER_HOURS } from "@/lib/constants/domain";

export type PhotoReminderMoment = "before" | "same_day" | "after";

/** A quest'ora partono i promemoria delle foto? */
export function isPhotoReminderHour(hour: number): boolean {
  return hour === JOURNEY_REMINDER_HOURS.sameDay;
}

/** Testo del promemoria: prima della sessione, il giorno stesso o dopo. */
export function photoReminderMoment(
  sessionDate: string,
  today: string,
): PhotoReminderMoment {
  if (sessionDate === today) return "same_day";
  return sessionDate > today ? "before" : "after";
}
