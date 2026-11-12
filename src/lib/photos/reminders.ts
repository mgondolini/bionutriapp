/**
 * Promemoria delle foto (C27): il giorno del check alle 8, al posto del
 * promemoria del mattino del percorso; poi 3 e 7 giorni dopo alle 18, solo
 * se il set non è salvato. Ore nel fuso dello studio (DEV-10).
 */
import {
  JOURNEY_REMINDER_HOURS,
  PHOTO_REMINDER_DAYS,
  type PhotoNotificationKind,
} from "@/lib/constants/domain";
import { addDays } from "@/lib/domain/tracking/dates";

export type PhotoReminderSlot = {
  kind: PhotoNotificationKind;
  /** Giorno del check a cui si riferisce il promemoria. */
  sessionDay: string;
};

export function photoReminderSlots(local: {
  day: string;
  hour: number;
}): PhotoReminderSlot[] {
  if (local.hour === JOURNEY_REMINDER_HOURS.sameDay) {
    return [{ kind: "photos_same_day", sessionDay: local.day }];
  }
  if (local.hour === JOURNEY_REMINDER_HOURS.dayBefore) {
    return PHOTO_REMINDER_DAYS.map((days) => ({
      kind: `photos_day_${days}` as PhotoNotificationKind,
      sessionDay: addDays(local.day, -days),
    }));
  }
  return [];
}
