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
