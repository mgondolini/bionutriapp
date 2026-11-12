/**
 * File .ics di una sessione (C19, "Aggiungi al calendario"). Con l'ora:
 * evento di un'ora nel fuso Europe/Rome; senza: evento di una giornata.
 */
import { addDays } from "@/lib/domain/tracking/dates";

export const ICS_DURATION_MINUTES = 60;

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function compactDay(day: string): string {
  return day.replaceAll("-", "");
}

function stamp(now: Date): string {
  return now
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function addMinutes(
  time: string,
  minutes: number,
): { time: string; nextDay: boolean } {
  const [h, m] = time.split(":").map(Number) as [number, number];
  const total = h * 60 + m + minutes;
  const nextDay = total >= 24 * 60;
  const wrapped = total % (24 * 60);
  return {
    time: `${String(Math.floor(wrapped / 60)).padStart(2, "0")}${String(wrapped % 60).padStart(2, "0")}00`,
    nextDay,
  };
}

/** Regole del fuso di Roma (ora legale UE), per i client che non le conoscono. */
const VTIMEZONE_ROME = [
  "BEGIN:VTIMEZONE",
  "TZID:Europe/Rome",
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:+0100",
  "TZOFFSETTO:+0200",
  "TZNAME:CEST",
  "DTSTART:19700329T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:+0200",
  "TZOFFSETTO:+0100",
  "TZNAME:CET",
  "DTSTART:19701025T030000",
  "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

export function buildIcs(event: {
  uid: string;
  title: string;
  description?: string;
  date: string;
  time: string | null;
  now?: Date;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nutrify//Percorso//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  if (event.time) lines.push(...VTIMEZONE_ROME);
  lines.push(
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${stamp(event.now ?? new Date())}`,
  );
  if (event.time) {
    const start = `${event.time.replace(":", "")}00`;
    const end = addMinutes(event.time, ICS_DURATION_MINUTES);
    lines.push(
      `DTSTART;TZID=Europe/Rome:${compactDay(event.date)}T${start}`,
      `DTEND;TZID=Europe/Rome:${compactDay(end.nextDay ? addDays(event.date, 1) : event.date)}T${end.time}`,
    );
  } else {
    lines.push(
      `DTSTART;VALUE=DATE:${compactDay(event.date)}`,
      `DTEND;VALUE=DATE:${compactDay(addDays(event.date, 1))}`,
    );
  }
  lines.push(`SUMMARY:${escapeText(event.title)}`);
  if (event.description) {
    lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}
