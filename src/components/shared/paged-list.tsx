"use client";

import { useState, type ReactNode } from "react";

import { paginate } from "@/lib/pagination";

import { Pagination } from "./pagination";

/**
 * Pagine scelte nel browser senza ricaricare: restituisce gli elementi della
 * pagina e le frecce. Se l'elenco si accorcia (modifica, eliminazione) la
 * pagina resta la stessa, riportata nell'intervallo.
 */
export function usePagedItems<T>(
  items: readonly T[],
  pageSize: number,
  className?: string,
): { visible: T[]; controls: ReactNode } {
  const [requested, setRequested] = useState(1);
  const { items: visible, ...page } = paginate(items, requested, pageSize);
  const controls = (
    <Pagination
      className={className}
      page={page}
      previous={
        page.page > 1 ? { onClick: () => setRequested(page.page - 1) } : null
      }
      next={
        page.page < page.pageCount
          ? { onClick: () => setRequested(page.page + 1) }
          : null
      }
    />
  );
  return { visible, controls };
}

/**
 * Elenco già pronto sul server mostrato a pagine nel browser (storico delle
 * misure, archivio dei file, storico delle fasi): `items` sono le righe
 * `<li>` con la loro `key`.
 */
export function PagedList({
  items,
  pageSize,
  as: List = "ul",
  className,
}: {
  items: ReactNode[];
  pageSize: number;
  as?: "ul" | "ol";
  className?: string;
}) {
  const { visible, controls } = usePagedItems(items, pageSize);
  return (
    <>
      <List className={className}>{visible}</List>
      {controls}
    </>
  );
}
