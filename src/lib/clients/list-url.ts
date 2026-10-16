/**
 * URL dell'elenco clienti con filtri e ricerca nei searchParams (A-02, A-03):
 * la pagina è condivisibile e il tasto Indietro funziona.
 */
import { CLIENT_LIST_PARAMS, ROUTES } from "@/lib/constants/domain";

import type { ClientListFilters } from "./list-filters";

export function clientListUrl(filters: ClientListFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set(CLIENT_LIST_PARAMS.status, filters.status);
  if (filters.stage) params.set(CLIENT_LIST_PARAMS.stage, filters.stage);
  const query = filters.query?.trim();
  if (query) params.set(CLIENT_LIST_PARAMS.query, query);
  const search = params.toString();
  return search ? `${ROUTES.admin.clients}?${search}` : ROUTES.admin.clients;
}
