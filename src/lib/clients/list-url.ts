/**
 * URL dell'elenco clienti con filtri, ricerca e pagina nei searchParams
 * (A-02, A-03): la pagina è condivisibile e il tasto Indietro funziona. Senza
 * `page` si torna alla prima pagina (cambio di filtro o di ricerca).
 */
import { CLIENT_LIST_PARAMS, ROUTES } from "@/lib/constants/domain";

import type { ClientListFilters } from "./list-filters";

export function clientListUrl(filters: ClientListFilters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.status) params.set(CLIENT_LIST_PARAMS.status, filters.status);
  if (filters.stage) params.set(CLIENT_LIST_PARAMS.stage, filters.stage);
  const query = filters.query?.trim();
  if (query) params.set(CLIENT_LIST_PARAMS.query, query);
  if (page > 1) params.set(CLIENT_LIST_PARAMS.page, String(page));
  const search = params.toString();
  return search ? `${ROUTES.admin.clients}?${search}` : ROUTES.admin.clients;
}
