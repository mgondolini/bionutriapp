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

const isoDay = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: TIME_ZONE,
});

/** Giorno di calendario "YYYY-MM-DD" a Roma per un istante (di default adesso). */
export function dayInRome(value: Date | string = new Date()): string {
  return isoDay.format(typeof value === "string" ? new Date(value) : value);
}

const sizeFormat = new Intl.NumberFormat("it-IT", {
  maximumFractionDigits: 1,
});

/** "320 KB", "1,4 MB" */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${sizeFormat.format(bytes / (1024 * 1024))} MB`;
}

const numericDate = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: TIME_ZONE,
});

/** "07/10/2026" */
export function formatNumericDate(value: string): string {
  return numericDate.format(toDate(value));
}

const MINUS = "−";

const decimalFormats = new Map<number, Intl.NumberFormat>();

function decimalFormat(digits: number): Intl.NumberFormat {
  let format = decimalFormats.get(digits);
  if (!format) {
    format = new Intl.NumberFormat("it-IT", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
      useGrouping: "always",
    });
    decimalFormats.set(digits, format);
  }
  return format;
}

/** "77,0", "4,3": numero con un numero fisso di decimali e il segno meno tipografico. */
export function formatDecimal(value: number, digits = 1): string {
  return decimalFormat(digits).format(value).replace("-", MINUS);
}

const compactNumber = new Intl.NumberFormat("it-IT", {
  maximumFractionDigits: 1,
  useGrouping: "always",
});

/** "8.000", "2,5", "2": decimali solo se servono. */
export function formatNumber(value: number): string {
  return compactNumber.format(value).replace("-", MINUS);
}

/** "+0,6", "−1,5 cm", "0,0 cm": differenza con segno (zero senza segno). */
export function formatSignedDelta(value: number, unit?: string | null): string {
  const rounded = Number(value.toFixed(1));
  const abs = decimalFormat(1).format(Math.abs(rounded));
  const sign = rounded > 0 ? "+" : rounded < 0 ? MINUS : "";
  return unit ? `${sign}${abs} ${unit}` : `${sign}${abs}`;
}

const dayMonthShort = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  timeZone: TIME_ZONE,
});

const dayMonthLong = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "long",
  timeZone: TIME_ZONE,
});

const weekdayShort = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  timeZone: TIME_ZONE,
});

/** "8 set" */
export function formatDayMonthShort(value: string): string {
  return dayMonthShort.format(toDate(value));
}

/** "13 ottobre" */
export function formatDayMonthLong(value: string): string {
  return dayMonthLong.format(toDate(value));
}

const weekdayLong = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  timeZone: TIME_ZONE,
});

/** "Martedì" */
export function formatWeekdayLong(value: string): string {
  const day = weekdayLong.format(toDate(value));
  return day.charAt(0).toUpperCase() + day.slice(1);
}

/** "Mar" */
export function formatWeekdayShort(value: string): string {
  const day = weekdayShort.format(toDate(value));
  return day.charAt(0).toUpperCase() + day.slice(1);
}
