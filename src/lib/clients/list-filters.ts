/**
 * Filtri, ricerca e conteggi dell'elenco clienti (A-02, A-03): funzioni pure.
 * L'elenco arriva con una sola query; qui si filtra in memoria (circa 100 clienti
 * per studio, NF-11) con la stessa normalizzazione del telefono del resto dell'app.
 */
import {
  ACCOUNT_STATUSES,
  JOURNEY_STAGES,
  type AccountStatus,
  type FileCategory,
  type JourneyStage,
} from "@/lib/constants/domain";
import { phoneMatchesQuery } from "@/lib/phone";

export type ClientListItem = {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  accountStatus: AccountStatus;
  journeyStage: JourneyStage;
  lastFile: {
    title: string;
    category: FileCategory;
    uploadedAt: string;
  } | null;
  lastEntryOn: string | null;
};

export type ClientListFilters = {
  status?: AccountStatus;
  stage?: JourneyStage;
  query?: string;
};

export type FacetCounts = {
  status: Record<AccountStatus, number> & { all: number };
  stage: Record<JourneyStage, number> & { all: number };
};

/** Minuscolo e senza accenti: "Niccolò" trova "niccolo". */
export function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("it-IT")
    .trim();
}

export function matchesQuery(
  item: ClientListItem,
  query: string | undefined,
): boolean {
  const text = normalizeText(query ?? "");
  if (!text) return true;
  const fullName = normalizeText(`${item.firstName} ${item.lastName ?? ""}`);
  const reversed = normalizeText(`${item.lastName ?? ""} ${item.firstName}`);
  return (
    fullName.includes(text) ||
    reversed.includes(text) ||
    normalizeText(item.email ?? "").includes(text) ||
    phoneMatchesQuery(item.phone, query ?? "")
  );
}

export function filterClients(
  items: readonly ClientListItem[],
  filters: ClientListFilters,
): ClientListItem[] {
  return items.filter(
    (item) =>
      (!filters.status || item.accountStatus === filters.status) &&
      (!filters.stage || item.journeyStage === filters.stage) &&
      matchesQuery(item, filters.query),
  );
}

/**
 * Conteggi "a faccette": ogni gruppo conta applicando la ricerca e il filtro
 * dell'altro gruppo, ma non il proprio (così ogni opzione mostra quanti
 * clienti si otterrebbero scegliendola).
 */
export function facetCounts(
  items: readonly ClientListItem[],
  filters: ClientListFilters,
): FacetCounts {
  const forStatus = filterClients(items, {
    stage: filters.stage,
    query: filters.query,
  });
  const forStage = filterClients(items, {
    status: filters.status,
    query: filters.query,
  });

  const status = Object.fromEntries(
    ACCOUNT_STATUSES.map((s) => [s, 0]),
  ) as FacetCounts["status"];
  status.all = forStatus.length;
  for (const item of forStatus) status[item.accountStatus] += 1;

  const stage = Object.fromEntries(
    JOURNEY_STAGES.map((s) => [s, 0]),
  ) as FacetCounts["stage"];
  stage.all = forStage.length;
  for (const item of forStage) stage[item.journeyStage] += 1;

  return { status, stage };
}
