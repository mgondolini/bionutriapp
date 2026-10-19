/**
 * Scelta del file "in corso" (C-04, DEV-10): funzioni pure, senza React né Supabase.
 */
import { FILE_CATEGORIES, type FileCategory } from "@/lib/constants/domain";
import { dayInRome } from "@/lib/format";

export type DatedFile = {
  id: string;
  category: FileCategory;
  /** Data di validità "YYYY-MM-DD" (null solo per file caricati senza). */
  validFrom: string | null;
  /** Istante del caricamento (ISO). */
  uploadedAt: string;
};

/** Giorno da cui il file vale: la data di validità o, se manca, quello del caricamento. */
function effectiveFrom(file: DatedFile): string {
  return file.validFrom ?? dayInRome(file.uploadedAt);
}

/** Ordine dal più recente: data di validità, poi caricamento. */
function newerFirst(a: DatedFile, b: DatedFile): number {
  const byValidity = effectiveFrom(b).localeCompare(effectiveFrom(a));
  if (byValidity !== 0) return byValidity;
  return b.uploadedAt.localeCompare(a.uploadedAt);
}

/** Dal più recente caricamento al più vecchio. */
export function byUploadDesc(a: DatedFile, b: DatedFile): number {
  return b.uploadedAt.localeCompare(a.uploadedAt);
}

/**
 * File in corso: tra quelli con data di validità non futura (giorno `today`
 * "YYYY-MM-DD"), quello con la validità più recente; a parità, l'ultimo caricato.
 */
export function currentFile<T extends DatedFile>(
  files: readonly T[],
  today: string,
): T | null {
  const eligible = files.filter((file) => effectiveFrom(file) <= today);
  return eligible.sort(newerFirst)[0] ?? null;
}

/** File in corso e archivio dei precedenti (compresi quelli con validità futura), dal più recente. */
export function splitCurrentAndArchive<T extends DatedFile>(
  files: readonly T[],
  today: string,
): { current: T | null; archive: T[] } {
  const current = currentFile(files, today);
  return {
    current,
    archive: files.filter((file) => file !== current).sort(byUploadDesc),
  };
}

/** Id del file in corso per ogni categoria (badge "In corso" nella scheda File). */
export function currentFileIds(
  files: readonly DatedFile[],
  today: string,
): Set<string> {
  const ids = new Set<string>();
  for (const category of FILE_CATEGORIES) {
    const current = currentFile(
      files.filter((file) => file.category === category),
      today,
    );
    if (current) ids.add(current.id);
  }
  return ids;
}

/** Ultimo file pubblicato, di qualsiasi categoria e validità (home del cliente, C-02). */
export function latestPublished<T extends DatedFile>(
  files: readonly T[],
): T | null {
  return [...files].sort(byUploadDesc)[0] ?? null;
}
