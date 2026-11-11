/**
 * Paginazione in memoria di elenchi già caricati (elenco clienti, storico di
 * una misura): funzione pura, la pagina fuori intervallo viene riportata
 * nell'intervallo valido.
 */
export type Page<T> = {
  items: T[];
  /** Pagina corrente, da 1. */
  page: number;
  pageCount: number;
  total: number;
  /** Posizione del primo e dell'ultimo elemento mostrato, da 1 (0 se vuoto). */
  from: number;
  to: number;
};

export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): Page<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(
    Math.max(1, Number.isFinite(page) ? Math.trunc(page) : 1),
    pageCount,
  );
  const start = (current - 1) * pageSize;
  const pageItems = items.slice(start, start + pageSize);
  return {
    items: pageItems,
    page: current,
    pageCount,
    total,
    from: total === 0 ? 0 : start + 1,
    to: start + pageItems.length,
  };
}
