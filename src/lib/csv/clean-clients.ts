/**
 * Pulizia delle righe del CSV (A-05), funzione pura (DEV-10):
 * spazi rimossi, email in minuscolo, cellulare in E.164, duplicati scartati
 * sia dentro il file sia rispetto ai clienti già presenti nello studio.
 */
import type { CsvDiscardReason, CsvRowWarning } from "@/lib/constants/domain";
import { normalizePhone } from "@/lib/phone";

import type { RawClientRow } from "./parse-clients-csv";

export type CleanClientRow = {
  line: number;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  birthDate: string | null;
  warnings: CsvRowWarning[];
};

export type DiscardedClientRow = {
  line: number;
  /** Nome e cellulare come scritti nel file, per riconoscere la riga nell'anteprima. */
  label: string;
  reason: CsvDiscardReason;
  /** Per i duplicati nel file: la riga che resta. */
  duplicateOfLine?: number;
};

export type CleanResult = {
  valid: CleanClientRow[];
  discarded: DiscardedClientRow[];
};

export type ExistingContacts = {
  /** Cellulari già presenti nello studio, in E.164. */
  phones: ReadonlySet<string>;
  /** Email già presenti nello studio, in minuscolo. */
  emails: ReadonlySet<string>;
};

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function collapseSpaces(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function cleanEmail(value: string): string | null {
  const email = value.replace(/\s+/g, "").toLowerCase();
  return EMAIL.test(email) ? email : null;
}

/**
 * Data di nascita in "YYYY-MM-DD" da "gg/mm/aaaa", "gg-mm-aaaa", "gg.mm.aaaa"
 * o "aaaa-mm-gg"; null se non valida, futura o precedente al 1900.
 */
export function parseBirthDate(
  value: string,
  today: Date = new Date(),
): string | null {
  const text = value.trim();
  let day: number, month: number, year: number;
  let match = text.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (match) {
    [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else if ((match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) {
    [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  const isReal =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
  if (!isReal || year < 1900 || date > today) return null;
  return date.toISOString().slice(0, 10);
}

export function cleanClientRows(
  rows: readonly RawClientRow[],
  existing: ExistingContacts,
  today: Date = new Date(),
): CleanResult {
  const valid: CleanClientRow[] = [];
  const discarded: DiscardedClientRow[] = [];
  const linesByPhone = new Map<string, number>();
  const linesByEmail = new Map<string, number>();

  for (const row of rows) {
    const firstName = collapseSpaces(row.firstName);
    const lastName = collapseSpaces(row.lastName) || null;
    const label = collapseSpaces(
      `${row.firstName} ${row.lastName} ${row.phone}`,
    );
    const discard = (reason: CsvDiscardReason, duplicateOfLine?: number) =>
      discarded.push({ line: row.line, label, reason, duplicateOfLine });

    if (!row.phone.trim()) {
      discard("missing_phone");
      continue;
    }
    const phone = normalizePhone(row.phone);
    if (!phone) {
      discard("invalid_phone");
      continue;
    }
    if (!firstName) {
      discard("missing_name");
      continue;
    }

    const warnings: CsvRowWarning[] = [];
    let email: string | null = null;
    if (row.email.trim()) {
      email = cleanEmail(row.email);
      if (!email) warnings.push("invalid_email_dropped");
    }
    let birthDate: string | null = null;
    if (row.birthDate.trim()) {
      birthDate = parseBirthDate(row.birthDate, today);
      if (!birthDate) warnings.push("invalid_birth_date_dropped");
    }

    const duplicateLine =
      linesByPhone.get(phone) ?? (email ? linesByEmail.get(email) : undefined);
    if (duplicateLine !== undefined) {
      discard("duplicate_in_file", duplicateLine);
      continue;
    }
    if (existing.phones.has(phone) || (email && existing.emails.has(email))) {
      discard("already_in_studio");
      continue;
    }

    linesByPhone.set(phone, row.line);
    if (email) linesByEmail.set(email, row.line);
    valid.push({
      line: row.line,
      firstName,
      lastName,
      phone,
      email,
      birthDate,
      warnings,
    });
  }

  return { valid, discarded };
}
