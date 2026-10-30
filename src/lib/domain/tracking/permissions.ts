/**
 * Chi può scrivere il tracking di un cliente (A-15, T-03). Stessa regola per
 * mostrare i pulsanti nelle due aree e nelle Server Actions; la RLS resta
 * l'ultima barriera.
 */
import type { EntryAuthorRole, JourneyStage } from "@/lib/constants/domain";

/** Chi guarda il tracking: lo staff dello studio o il cliente con la sua fase. */
export type EntryViewer =
  { role: "staff" } | { role: "client"; journeyStage: JourneyStage };

/** Nuove registrazioni: lo staff in ogni fase, il cliente solo In percorso. */
export function canWriteTracking(viewer: EntryViewer): boolean {
  return viewer.role === "staff" || viewer.journeyStage === "in_progress";
}

/**
 * Correzione o eliminazione di una registrazione: lo staff sempre, il cliente
 * solo se l'ha inserita lui e il percorso è In percorso.
 */
export function canEditEntry(
  entry: { createdByRole: EntryAuthorRole },
  viewer: EntryViewer,
): boolean {
  if (viewer.role === "staff") return true;
  return canWriteTracking(viewer) && entry.createdByRole === "client";
}
