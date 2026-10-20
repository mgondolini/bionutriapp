import {
  addEntryAction,
  updateEntryAction,
} from "@/server/actions/tracking.actions";

/** Un form di registrazione crea una nuova registrazione o ne corregge una (T-03). */
export type EntryFormMode =
  { kind: "create"; metricId: string } | { kind: "edit"; entryId: string };

/** Invio dei valori grezzi: la Server Action li rivalida con i limiti della misura. */
export function submitEntry(
  mode: EntryFormMode,
  values: Record<string, unknown>,
) {
  return mode.kind === "create"
    ? addEntryAction({ metricId: mode.metricId, values })
    : updateEntryAction({ entryId: mode.entryId, values });
}
