/**
 * Promemoria delle sessioni (C21): la sera prima e la mattina stessa, alle
 * ore di JOURNEY_REMINDER_HOURS nel fuso dello studio (DEV-10).
 */
import { JOURNEY_REMINDER_HOURS } from "@/lib/constants/domain";
import { addDays } from "@/lib/domain/tracking/dates";

export type ReminderKind = "reminder_day_before" | "reminder_same_day";

export type ReminderTime = { kind: ReminderKind; day: string; hour: number };

/**
 * Quando partono i promemoria di una sessione. Quello del mattino salta se
 * la sessione ha un'ora che arriva prima (o insieme) all'invio.
 */
export function reminderTimes(session: {
  date: string;
  time: string | null;
}): ReminderTime[] {
  const times: ReminderTime[] = [
    {
      kind: "reminder_day_before",
      day: addDays(session.date, -1),
      hour: JOURNEY_REMINDER_HOURS.dayBefore,
    },
  ];
  const sameDayAt = `${String(JOURNEY_REMINDER_HOURS.sameDay).padStart(2, "0")}:00`;
  if (!session.time || session.time > sameDayAt) {
    times.push({
      kind: "reminder_same_day",
      day: session.date,
      hour: JOURNEY_REMINDER_HOURS.sameDay,
    });
  }
  return times;
}

/**
 * Quale promemoria tocca adesso (giorno e ora locali dello studio) e per
 * quale giorno di sessione: null se a quest'ora non parte niente.
 */
export function reminderSlot(local: {
  day: string;
  hour: number;
}): { kind: ReminderKind; sessionDay: string } | null {
  if (local.hour === JOURNEY_REMINDER_HOURS.dayBefore) {
    return { kind: "reminder_day_before", sessionDay: addDays(local.day, 1) };
  }
  if (local.hour === JOURNEY_REMINDER_HOURS.sameDay) {
    return { kind: "reminder_same_day", sessionDay: local.day };
  }
  return null;
}

/** La sessione riceve il promemoria di questo turno? */
export function isReminderDue(
  session: { date: string; time: string | null },
  slot: { kind: ReminderKind; sessionDay: string },
): boolean {
  return (
    session.date === slot.sessionDay &&
    reminderTimes(session).some((time) => time.kind === slot.kind)
  );
}
