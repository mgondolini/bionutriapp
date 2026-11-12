/**
 * File .ics di una sessione (A17, C22: Apple Calendar e "Altro calendario").
 * Con l'ora: evento lungo quanto la sessione nel fuso Europe/Rome; senza:
 * evento di una giornata. Il link Meet va in LOCATION, URL e descrizione;
 * l'evento dello staff invita l'email del cliente (ATTENDEE).
 */
import { addDays } from "@/lib/domain/tracking/dates";

import { eventDetails, eventEnd, type CalendarEvent } from "./calendar";

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

/** Righe oltre 75 byte spezzate come vuole RFC 5545 (continuazione con uno spazio). */
function fold(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildIcs(
  event: CalendarEvent & { now?: Date },
  meetLine: string,
): string {
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
    const end = eventEnd(event.date, event.time, event.durationMinutes);
    lines.push(
      `DTSTART;TZID=Europe/Rome:${compactDay(event.date)}T${event.time.replace(":", "")}00`,
      `DTEND;TZID=Europe/Rome:${compactDay(end.date)}T${end.time.replace(":", "")}00`,
    );
  } else {
    lines.push(
      `DTSTART;VALUE=DATE:${compactDay(event.date)}`,
      `DTEND;VALUE=DATE:${compactDay(addDays(event.date, 1))}`,
    );
  }
  lines.push(`SUMMARY:${escapeText(event.title)}`);
  lines.push(`DESCRIPTION:${escapeText(eventDetails(event, meetLine))}`);
  if (event.meetingUrl) {
    lines.push(
      `LOCATION:${escapeText(event.meetingUrl)}`,
      `URL:${event.meetingUrl}`,
    );
  }
  if (event.attendeeEmail) {
    lines.push(
      `ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${event.attendeeEmail}`,
    );
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.map(fold).join("\r\n")}\r\n`;
}
