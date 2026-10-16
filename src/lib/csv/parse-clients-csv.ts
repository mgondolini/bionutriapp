/**
 * Lettura del CSV dei clienti (A-05): separatore "," o ";", intestazioni in italiano.
 * Funzione pura: restituisce le righe grezze con il loro numero di riga nel file.
 */
import Papa from "papaparse";

import { CSV_MAX_ROWS, type CsvFileError } from "@/lib/constants/domain";

export type RawClientRow = {
  /** Numero di riga nel file (l'intestazione è la riga 1). */
  line: number;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  birthDate: string;
};

type Field = Exclude<keyof RawClientRow, "line">;

/** Intestazioni riconosciute (dopo la normalizzazione), per ciascun campo. */
const HEADER_ALIASES: Record<Field, string[]> = {
  firstName: ["nome", "first name", "firstname", "name"],
  lastName: ["cognome", "last name", "lastname", "surname"],
  phone: [
    "cellulare",
    "telefono",
    "cell",
    "tel",
    "numero",
    "numero di telefono",
    "mobile",
    "phone",
  ],
  email: ["email", "e mail", "mail", "posta elettronica"],
  birthDate: [
    "data di nascita",
    "data nascita",
    "nascita",
    "birth date",
    "birthdate",
    "data di nascita gg mm aaaa",
  ],
};

export type ParseResult =
  { ok: true; rows: RawClientRow[] } | { ok: false; error: CsvFileError };

export function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[_\-./()]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function fieldForHeader(header: string): Field | null {
  const normalized = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [
    Field,
    string[],
  ][]) {
    if (aliases.includes(normalized)) return field;
  }
  return null;
}

/**
 * Separatore dall'intestazione: ";" (Excel in italiano) se compare più spesso
 * della virgola, altrimenti ",". Il riconoscimento automatico di papaparse
 * sbaglia con poche righe.
 */
export function detectDelimiter(text: string): "," | ";" {
  const header = text.split(/\r?\n/, 1)[0] ?? "";
  const count = (char: string) => header.split(char).length - 1;
  return count(";") > count(",") ? ";" : ",";
}

const BOM = /^﻿/;

export function parseClientsCsv(text: string): ParseResult {
  const content = text.replace(BOM, "");
  const parsed = Papa.parse<string[]>(content, {
    delimiter: detectDelimiter(content),
    skipEmptyLines: false,
  });
  const [header, ...records] = parsed.data;
  if (!header || header.every((cell) => !cell?.trim()))
    return { ok: false, error: "empty" };

  const columns = header.map(fieldForHeader);
  if (!columns.includes("phone"))
    return { ok: false, error: "missing_phone_column" };

  const rows: RawClientRow[] = [];
  records.forEach((record, index) => {
    if (record.every((cell) => !cell?.trim())) return; // riga vuota
    const row: RawClientRow = {
      line: index + 2,
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      birthDate: "",
    };
    columns.forEach((field, column) => {
      if (field && !row[field]) row[field] = (record[column] ?? "").trim();
    });
    rows.push(row);
  });

  if (rows.length === 0) return { ok: false, error: "empty" };
  if (rows.length > CSV_MAX_ROWS) return { ok: false, error: "too_many_rows" };
  return { ok: true, rows };
}
