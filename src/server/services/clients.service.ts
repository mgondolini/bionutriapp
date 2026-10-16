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
  type ClientOrigin,
  type CsvFileError,
  type FileCategory,
  type JourneyStage,
} from "@/lib/constants/domain";
import { cleanClientRows, type CleanResult } from "@/lib/csv/clean-clients";
import { planStageChange } from "@/lib/domain/journey";
import { ageOn } from "@/lib/format";
import { parseClientsCsv } from "@/lib/csv/parse-clients-csv";
import * as authAdminRepository from "@/server/repositories/auth-admin.repository";
import * as clientsRepository from "@/server/repositories/clients.repository";
import type {
  CreateClientInput,
  UpdateClientInput,
} from "@/server/validation/clients.schema";

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
  origin: ClientOrigin;
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
    origin: row.origin as ClientOrigin,
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

export type StageHistoryItem = {
  id: string;
  from: JourneyStage | null;
  to: JourneyStage;
  changedAt: string;
  source: "manual" | "automatic";
  authorName: string | null;
};

export type ClientProfile = {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  birthDate: string | null;
  /** Anni compiuti oggi (null senza data di nascita). */
  age: number | null;
  origin: ClientOrigin;
  accountStatus: AccountStatus;
  journeyStage: JourneyStage;
  activatedAt: string | null;
  pushEnabled: boolean;
  hasAccount: boolean;
  lastInvite: {
    sentAt: string | null;
    expiresAt: string;
    usedAt: string | null;
  } | null;
  history: StageHistoryItem[];
};

/** Scheda Profilo (A-06, A-07, ST-04); null se il cliente non è dello studio. */
export async function getClientProfile(
  studioId: string,
  clientId: string,
): Promise<ClientProfile | null> {
  const row = await clientsRepository.getClientProfile(clientId);
  if (!row?.id || row.studio_id !== studioId) return null;
  const history = await clientsRepository.listStageHistory(clientId);
  return {
    id: row.id,
    firstName: row.first_name!,
    lastName: row.last_name,
    phone: row.phone!,
    email: row.email,
    birthDate: row.birth_date,
    age: row.birth_date ? ageOn(row.birth_date, new Date()) : null,
    origin: row.origin as ClientOrigin,
    accountStatus: row.effective_account_status as AccountStatus,
    journeyStage: row.journey_stage as JourneyStage,
    activatedAt: row.activated_at,
    pushEnabled: row.push_enabled ?? false,
    hasAccount: row.user_id !== null,
    lastInvite: row.last_invite_expires_at
      ? {
          sentAt: row.last_invite_sent_at,
          expiresAt: row.last_invite_expires_at,
          usedAt: row.last_invite_used_at,
        }
      : null,
    history: history.map((event) => ({
      id: event.id!,
      from: event.from_stage as JourneyStage | null,
      to: event.to_stage as JourneyStage,
      changedAt: event.changed_at!,
      source: event.source as "manual" | "automatic",
      authorName: event.changed_by_name,
    })),
  };
}

/** Cliente dello studio con i campi che servono alle modifiche (RLS + controllo esplicito). */
async function loadOwnedClient(studioId: string, clientId: string) {
  const row = await clientsRepository.getClientProfile(clientId);
  if (!row?.id || row.studio_id !== studioId) return null;
  return row;
}

export type UpdateClientResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "not_found"
        | "duplicate_phone"
        | "duplicate_email"
        | "email_required"
        | "auth_conflict";
    };

/**
 * Modifica dei dati (A-06). Se il cliente ha un account, cellulare ed email
 * cambiano anche in Supabase Auth: prima Auth (unicità globale), poi il
 * database; se il database rifiuta, Auth torna ai valori precedenti.
 */
export async function updateClient(
  studioId: string,
  input: UpdateClientInput,
): Promise<UpdateClientResult> {
  const current = await loadOwnedClient(studioId, input.clientId);
  if (!current) return { ok: false, reason: "not_found" };

  const userId = current.user_id;
  const contactsChanged =
    input.phone !== current.phone || input.email !== current.email;

  // Supabase Auth non permette di togliere l'email a un account: si può solo cambiarla.
  if (userId && current.email && !input.email) {
    return { ok: false, reason: "email_required" };
  }

  if (userId && contactsChanged) {
    const synced = await authAdminRepository.updateContacts(userId, {
      phone: input.phone,
      email: input.email,
    });
    if (!synced.ok) return { ok: false, reason: "auth_conflict" };
  }

  const updated = await clientsRepository.updateClientData(input.clientId, {
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    email: input.email,
    birthDate: input.birthDate,
  });
  if (updated.ok) return { ok: true };

  if (userId && contactsChanged) {
    await authAdminRepository.updateContacts(userId, {
      phone: current.phone!,
      email: current.email,
    });
  }
  if (updated.reason === "duplicate_email")
    return { ok: false, reason: "duplicate_email" };
  if (updated.reason === "not_found") return { ok: false, reason: "not_found" };
  return { ok: false, reason: "duplicate_phone" };
}

export type ChangeStageResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "not_allowed" | "conflict" };

/**
 * Cambio di fase manuale (ST-02, A-07). Le transizioni consentite vengono da
 * planStageChange (la stessa funzione decide i pulsanti); il database
 * aggiorna solo se la fase è ancora `from` e registra lo storico con l'autore.
 */
export async function changeStage(
  studioId: string,
  input: { clientId: string; from: JourneyStage; to: JourneyStage },
): Promise<ChangeStageResult> {
  const plan = planStageChange(input.from, input.to, "manual");
  if (!plan.ok) return { ok: false, reason: "not_allowed" };

  const current = await loadOwnedClient(studioId, input.clientId);
  if (!current) return { ok: false, reason: "not_found" };
  if (current.journey_stage !== input.from)
    return { ok: false, reason: "conflict" };

  const changed = await clientsRepository.setJourneyStage(
    input.clientId,
    plan.change.from,
    plan.change.to,
    plan.change.source === "automatic",
  );
  return changed ? { ok: true } : { ok: false, reason: "conflict" };
}

export type AccountToggleResult =
  { ok: true } | { ok: false; reason: "not_found" | "not_allowed" | "error" };

/**
 * Disattiva l'account (ST-01: la fase non cambia). Il database revoca gli
 * inviti aperti; l'utente viene bloccato in Supabase Auth, così non può più
 * accedere né rinnovare la sessione. Se il blocco fallisce si torna indietro.
 */
export async function disableAccount(
  studioId: string,
  clientId: string,
): Promise<AccountToggleResult> {
  const current = await loadOwnedClient(studioId, clientId);
  if (!current) return { ok: false, reason: "not_found" };
  if (current.account_status === "disabled")
    return { ok: false, reason: "not_allowed" };

  await clientsRepository.setAccountStatus(clientId, "disabled");
  if (current.user_id) {
    const banned = await authAdminRepository.setBanned(current.user_id, true);
    if (!banned) {
      await clientsRepository.setAccountStatus(
        clientId,
        current.account_status as "active" | "to_invite" | "invited",
      );
      return { ok: false, reason: "error" };
    }
  }
  return { ok: true };
}

/**
 * Riattiva l'account: torna "Attivo" se il cliente aveva già un account
 * (sbloccato in Auth), altrimenti "Da invitare" (gli inviti erano stati revocati).
 */
export async function enableAccount(
  studioId: string,
  clientId: string,
): Promise<AccountToggleResult> {
  const current = await loadOwnedClient(studioId, clientId);
  if (!current) return { ok: false, reason: "not_found" };
  if (current.account_status !== "disabled")
    return { ok: false, reason: "not_allowed" };

  if (current.user_id) {
    const unbanned = await authAdminRepository.setBanned(
      current.user_id,
      false,
    );
    if (!unbanned) return { ok: false, reason: "error" };
  }
  await clientsRepository.setAccountStatus(
    clientId,
    current.user_id ? "active" : "to_invite",
  );
  return { ok: true };
}
