/**
 * Filtri, ricerca e conteggi dell'elenco clienti (A-02, A-03): funzioni pure.
 * L'elenco arriva con una sola query; qui si filtra in memoria (circa 100 clienti
 * per studio, NF-11) con la stessa normalizzazione del telefono del resto dell'app.
 */
import {
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
 * Filtri rapidi dell'elenco (A-02, mockup-v2-admin): pill con il conteggio.
 * Ognuno è una combinazione dei filtri esistenti (stato o fase), quindi l'URL
 * (`?stato`, `?fase`) e `filterClients` restano quelli di prima.
 */
export const QUICK_FILTERS = [
  "all",
  "in_progress",
  "onboarding",
  "invite_expired",
] as const;
export type QuickFilter = (typeof QUICK_FILTERS)[number];
export type QuickFilterCounts = Record<QuickFilter, number>;

const QUICK_FILTER_VALUES: Record<
  QuickFilter,
  Pick<ClientListFilters, "status" | "stage">
> = {
  all: {},
  in_progress: { stage: "in_progress" },
  onboarding: { stage: "onboarding" },
  invite_expired: { status: "invite_expired" },
};

/** Filtri dell'URL di una pill: la ricerca resta, gli altri filtri si azzerano. */
export function quickFilterFilters(
  key: QuickFilter,
  query: string | undefined,
): ClientListFilters {
  return { ...QUICK_FILTER_VALUES[key], query };
}

/** Pill selezionata; null se l'URL ha una combinazione che nessuna pill rappresenta. */
export function activeQuickFilter(
  filters: ClientListFilters,
): QuickFilter | null {
  return (
    QUICK_FILTERS.find((key) => {
      const value = QUICK_FILTER_VALUES[key];
      return value.status === filters.status && value.stage === filters.stage;
    }) ?? null
  );
}

/** Quanti clienti mostra ogni pill, con la ricerca applicata. */
export function quickFilterCounts(
  items: readonly ClientListItem[],
  query: string | undefined,
): QuickFilterCounts {
  return Object.fromEntries(
    QUICK_FILTERS.map((key) => [
      key,
      filterClients(items, quickFilterFilters(key, query)).length,
    ]),
  ) as QuickFilterCounts;
}
