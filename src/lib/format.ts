/**
 * Formattazione di date per l'interfaccia, in italiano e nel fuso Europe/Rome.
 */
const TIME_ZONE = "Europe/Rome";

const shortDate = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const longDate = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
});

/** Una data "YYYY-MM-DD" va letta come giorno di calendario, senza spostamenti di fuso. */
function toDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00Z`)
    : new Date(value);
}

/** "7 ott 2026" */
export function formatShortDate(value: string): string {
  return shortDate.format(toDate(value));
}

/** "7 ottobre 2026" */
export function formatLongDate(value: string): string {
  return longDate.format(toDate(value));
}

const dateTime = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

const shortDateTime = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

/** "12 aprile 2026 alle ore 17:50" → "12 aprile 2026, 17:50" */
export function formatDateTime(value: string): string {
  return dateTime.format(new Date(value)).replace(" alle ore", ",");
}

/** "1 set 2026, 09:10" */
export function formatShortDateTime(value: string): string {
  return shortDateTime.format(new Date(value)).replace(" alle ore", ",");
}

/** Anni compiuti alla data `today` per una data di nascita "YYYY-MM-DD". */
export function ageOn(birthDate: string, today: Date): number {
  const [year, month, day] = birthDate.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  let age = today.getFullYear() - year;
  const beforeBirthday =
    today.getMonth() + 1 < month ||
    (today.getMonth() + 1 === month && today.getDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}
