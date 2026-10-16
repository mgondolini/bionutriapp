import "server-only";

import {
  facetCounts,
  filterClients,
  type ClientListFilters,
  type ClientListItem,
  type FacetCounts,
} from "@/lib/clients/list-filters";
import {
  ORIGIN_BY_CREATION_MODE,
  type AccountStatus,
  type CsvFileError,
  type FileCategory,
  type JourneyStage,
} from "@/lib/constants/domain";
import { cleanClientRows, type CleanResult } from "@/lib/csv/clean-clients";
import { parseClientsCsv } from "@/lib/csv/parse-clients-csv";
import * as clientsRepository from "@/server/repositories/clients.repository";
import type { CreateClientInput } from "@/server/validation/clients.schema";

type ListRow = Awaited<
  ReturnType<typeof clientsRepository.listClients>
>[number];

/** Riga della vista → elemento dell'elenco (le colonne di una vista risultano tutte nullable). */
function toListItem(row: ListRow): ClientListItem {
  return {
    id: row.id!,
    firstName: row.first_name!,
    lastName: row.last_name,
    phone: row.phone!,
    email: row.email,
    accountStatus: row.effective_account_status as AccountStatus,
    journeyStage: row.journey_stage as JourneyStage,
    lastFile:
      row.last_file_title && row.last_file_uploaded_at
        ? {
            title: row.last_file_title,
            category: row.last_file_category as FileCategory,
            uploadedAt: row.last_file_uploaded_at,
          }
        : null,
    lastEntryOn: row.last_entry_on,
  };
}

export type ClientList = {
  items: ClientListItem[];
  counts: FacetCounts;
  /** Totale dei clienti dello studio, senza filtri. */
  total: number;
};

/** Elenco filtrato con i conteggi dei filtri: una sola query, il resto in memoria. */
export async function getClientList(
  studioId: string,
  filters: ClientListFilters,
): Promise<ClientList> {
  const all = (await clientsRepository.listClients(studioId)).map(toListItem);
  return {
    items: filterClients(all, filters),
    counts: facetCounts(all, filters),
    total: all.length,
  };
}

export type ClientHeader = {
  id: string;
  firstName: string;
  lastName: string | null;
  accountStatus: AccountStatus;
  journeyStage: JourneyStage;
  activatedAt: string | null;
};

export async function getClientHeader(
  clientId: string,
): Promise<ClientHeader | null> {
  const row = await clientsRepository.getClientHeader(clientId);
  if (!row?.id) return null;
  return {
    id: row.id,
    firstName: row.first_name!,
    lastName: row.last_name,
    accountStatus: row.effective_account_status as AccountStatus,
    journeyStage: row.journey_stage as JourneyStage,
    activatedAt: row.activated_at,
  };
}

export type CreateClientResult =
  | { ok: true; id: string }
  | { ok: false; reason: "duplicate_phone" | "duplicate_email" | "duplicate" };

/** Crea un cliente; la modalità decide l'origine (e quindi la fase iniziale). */
export async function createClient(
  studioId: string,
  input: CreateClientInput,
): Promise<CreateClientResult> {
  const result = await clientsRepository.insertClients(studioId, [
    {
      firstName: input.firstName,
      lastName: input.mode === "full" ? input.lastName : null,
      phone: input.phone,
      email: input.mode === "full" ? input.email : null,
      birthDate: input.mode === "full" ? input.birthDate : null,
      origin: ORIGIN_BY_CREATION_MODE[input.mode],
    },
  ]);
  return result.ok ? { ok: true, id: result.ids[0]! } : result;
}

export type ImportAnalysis =
  { ok: true; result: CleanResult } | { ok: false; error: CsvFileError };

/** Lettura e pulizia del CSV, confrontando i contatti già presenti nello studio. */
export async function analyzeImport(
  studioId: string,
  csvText: string,
): Promise<ImportAnalysis> {
  const parsed = parseClientsCsv(csvText);
  if (!parsed.ok) return parsed;

  const contacts = await clientsRepository.getStudioContacts(studioId);
  const existing = {
    phones: new Set(contacts.map((c) => c.phone)),
    emails: new Set(contacts.flatMap((c) => (c.email ? [c.email] : []))),
  };
  return { ok: true, result: cleanClientRows(parsed.rows, existing) };
}

export type ImportResult =
  | { ok: true; imported: number }
  | { ok: false; error: CsvFileError | "conflict" | "no_valid_rows" };

/**
 * Conferma dell'import: il file viene rianalizzato da capo (non ci si fida
 * dell'anteprima) e le righe valide entrano con un solo INSERT, tutto o niente.
 */
export async function importClients(
  studioId: string,
  csvText: string,
): Promise<ImportResult> {
  const analysis = await analyzeImport(studioId, csvText);
  if (!analysis.ok) return analysis;
  const { valid } = analysis.result;
  if (valid.length === 0) return { ok: false, error: "no_valid_rows" };

  const inserted = await clientsRepository.insertClients(
    studioId,
    valid.map((row) => ({ ...row, origin: "imported" as const })),
  );
  if (!inserted.ok) return { ok: false, error: "conflict" };
  return { ok: true, imported: inserted.ids.length };
}
