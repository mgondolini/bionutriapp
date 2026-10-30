import {
  addEntryAction,
  updateEntryAction,
} from "@/server/actions/tracking.actions";

/**
 * Un form di registrazione crea una nuova registrazione o ne corregge una
 * (T-03, A-15). `clientId` c'è solo nell'area admin: lo staff indica il
 * cliente, il cliente scrive sempre per sé.
 */
export type EntryFormMode =
  | { kind: "create"; metricId: string; clientId?: string }
  | { kind: "edit"; entryId: string; clientId?: string };

/** Invio dei valori grezzi: la Server Action li rivalida con i limiti della misura. */
export function submitEntry(
  mode: EntryFormMode,
  values: Record<string, unknown>,
) {
  return mode.kind === "create"
    ? addEntryAction({
        clientId: mode.clientId,
        metricId: mode.metricId,
        values,
      })
    : updateEntryAction({
        clientId: mode.clientId,
        entryId: mode.entryId,
        values,
      });
}
