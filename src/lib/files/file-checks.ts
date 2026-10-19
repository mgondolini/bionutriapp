/**
 * Controlli sui file PDF (A-08) e filtri della scheda File: funzioni pure,
 * usate nel browser prima del caricamento e sul server alla conferma.
 */
import {
  FILE_CATEGORIES,
  FILE_EXTENSION,
  FILE_MAX_BYTES,
  FILE_MIME_TYPE,
  PDF_MAGIC,
  type FileCategory,
  type FileUploadError,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

/** Vero se i byte iniziano con "%PDF-". */
export function hasPdfHeader(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_MAGIC.length) return false;
  for (let i = 0; i < PDF_MAGIC.length; i++) {
    if (bytes[i] !== PDF_MAGIC.charCodeAt(i)) return false;
  }
  return true;
}

/**
 * Nome, tipo e dimensione dichiarati dal browser. Il tipo può essere vuoto
 * (alcuni sistemi non lo conoscono): decide l'estensione, poi i primi byte.
 */
export function checkDeclaredFile(file: {
  name: string;
  type: string;
  size: number;
}): FileUploadError | null {
  const isPdfName = file.name.toLowerCase().endsWith(FILE_EXTENSION);
  if (!isPdfName || (file.type !== "" && file.type !== FILE_MIME_TYPE)) {
    return "not_pdf";
  }
  if (file.size <= 0) return "empty";
  if (file.size > FILE_MAX_BYTES) return "too_large";
  return null;
}

/**
 * Caratteri ammessi nel nome scaricato: ASCII stampabile senza quelli vietati
 * dai sistemi operativi e senza "%" (Storage codifica il nome nell'intestazione
 * Content-Disposition e un carattere non ASCII arriverebbe codificato due volte).
 */
const UNSAFE_NAME_CHARS = /[^\x20-\x7e]|[\\/:*?"<>|%]/g;
const DOWNLOAD_NAME_MAX = 100;

/** Nome del file scaricato, ricavato dal titolo: "Piano alimentare ottobre.pdf" ("è" → "e"). */
export function downloadFileName(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(UNSAFE_NAME_CHARS, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.\s]+/, "")
    .slice(0, DOWNLOAD_NAME_MAX)
    .trim();
  const name = base.toLowerCase().endsWith(FILE_EXTENSION)
    ? base.slice(0, -FILE_EXTENSION.length).trim()
    : base;
  return `${name || copy.files.downloadFallback}${FILE_EXTENSION}`;
}

/** Filtro per categoria; `null` = tutte. */
export function filterByCategory<T extends { category: FileCategory }>(
  files: readonly T[],
  category: FileCategory | null,
): T[] {
  return category
    ? files.filter((file) => file.category === category)
    : [...files];
}

/** Conteggi per il filtro: totale e per categoria. */
export function countByCategory(
  files: readonly { category: FileCategory }[],
): Record<FileCategory | "all", number> {
  const counts = { all: files.length } as Record<FileCategory | "all", number>;
  for (const category of FILE_CATEGORIES) {
    counts[category] = files.filter(
      (file) => file.category === category,
    ).length;
  }
  return counts;
}
