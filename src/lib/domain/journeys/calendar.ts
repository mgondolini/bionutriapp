/**
 * "Aggiungi al calendario" (A17, C22): un evento di una sessione e i link per
 * aprirlo in Google Calendar e Outlook sul web. Il file .ics (Apple e altri
 * calendari) lo costruisce ics.ts dallo stesso evento.
 *
 * Con l'ora l'evento dura quanto la sessione (sessionMinutes: onboarding
 * un'ora, check 30 minuti) nel fuso di Roma; senza, occupa la giornata. Il link Meet arriva già scelto da resolveMeetingUrl.
 */
import {
  JOURNEY_CALENDAR_TIMEZONE,
  JOURNEY_SESSION_MINUTES,
} from "@/lib/constants/domain";
import { addDays } from "@/lib/domain/tracking/dates";

/** Minuti della call: l'onboarding dura un'ora, i check (omaggio compreso) 30. */
export function sessionMinutes(type: "onboarding" | "check" | "gift"): number {
  return type === "onboarding"
    ? JOURNEY_SESSION_MINUTES.onboarding
    : JOURNEY_SESSION_MINUTES.check;
}

export type CalendarEvent = {
  uid: string;
  title: string;
  description: string;
  /** "YYYY-MM-DD". */
  date: string;
  /** "HH:MM" o null (evento di una giornata). */
  time: string | null;
  /** Durata con l'ora, da sessionMinutes. */
  durationMinutes: number;
  meetingUrl: string | null;
  /** Solo l'evento dello staff invita il cliente. */
  attendeeEmail?: string | null;
};

/** Fine dell'evento: giorno e ora, anche oltre la mezzanotte. */
export function eventEnd(
  date: string,
  time: string,
  minutes: number,
): { date: string; time: string } {
  const [h, m] = time.split(":").map(Number) as [number, number];
  const total = h * 60 + m + minutes;
  const day = Math.floor(total / (24 * 60));
  const wrapped = total % (24 * 60);
  return {
    date: day > 0 ? addDays(date, day) : date,
    time: `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`,
  };
}

/** Descrizione con il link della videochiamata in fondo, se c'è. */
export function eventDetails(event: CalendarEvent, meetLine: string): string {
  return event.meetingUrl
    ? `${event.description}\n\n${meetLine} ${event.meetingUrl}`
    : event.description;
}

function compact(date: string, time?: string): string {
  const day = date.replaceAll("-", "");
  return time ? `${day}T${time.replace(":", "")}00` : day;
}

/** Scarto da UTC di Roma in quel giorno e ora, come "+01:00" o "+02:00". */
export function romeOffset(date: string, time: string): string {
  const [y, mo, d] = date.split("-").map(Number) as [number, number, number];
  const [h, mi] = time.split(":").map(Number) as [number, number];
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  const offsetAt = (instant: number) => {
    const name =
      new Intl.DateTimeFormat("en-US", {
        timeZone: JOURNEY_CALENDAR_TIMEZONE,
        timeZoneName: "longOffset",
      })
        .formatToParts(new Date(instant))
        .find((part) => part.type === "timeZoneName")?.value ?? "GMT";
    const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
    if (!match) return 0;
    const sign = match[1] === "-" ? -1 : 1;
    return sign * (Number(match[2]) * 60 + Number(match[3]));
  };
  // l'ora locale va convertita all'istante giusto: si corregge una volta
  const minutes = offsetAt(wall - offsetAt(wall) * 60_000);
  const abs = Math.abs(minutes);
  return `${minutes < 0 ? "-" : "+"}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/** Google Calendar: modulo di un nuovo evento già compilato. */
export function googleCalendarUrl(
  event: CalendarEvent,
  meetLine: string,
): string {
  const params = new URLSearchParams({ action: "TEMPLATE", text: event.title });
  if (event.time) {
    const end = eventEnd(event.date, event.time, event.durationMinutes);
    params.set(
      "dates",
      `${compact(event.date, event.time)}/${compact(end.date, end.time)}`,
    );
    params.set("ctz", JOURNEY_CALENDAR_TIMEZONE);
  } else {
    params.set(
      "dates",
      `${compact(event.date)}/${compact(addDays(event.date, 1))}`,
    );
  }
  params.set("details", eventDetails(event, meetLine));
  if (event.meetingUrl) params.set("location", event.meetingUrl);
  if (event.attendeeEmail) params.set("add", event.attendeeEmail);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Outlook sul web: nuovo evento con orari completi di scarto da UTC. */
export function outlookCalendarUrl(
  event: CalendarEvent,
  meetLine: string,
): string {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
  });
  if (event.time) {
    const end = eventEnd(event.date, event.time, event.durationMinutes);
    params.set(
      "startdt",
      `${event.date}T${event.time}:00${romeOffset(event.date, event.time)}`,
    );
    params.set(
      "enddt",
      `${end.date}T${end.time}:00${romeOffset(end.date, end.time)}`,
    );
  } else {
    params.set("allday", "true");
    params.set("startdt", event.date);
    params.set("enddt", addDays(event.date, 1));
  }
  params.set("body", eventDetails(event, meetLine));
  if (event.meetingUrl) params.set("location", event.meetingUrl);
  if (event.attendeeEmail) params.set("to", event.attendeeEmail);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
