"use client";

import { useState, type ReactNode } from "react";

import { paginate } from "@/lib/pagination";

import { Pagination } from "./pagination";

/**
 * Elenco già pronto sul server mostrato a pagine nel browser (storico delle
 * misure): `items` sono le righe `<li>` con la loro `key`. Dopo una modifica
 * o un'eliminazione la pagina resta la stessa, riportata nell'intervallo.
 */
export function PagedList({
  items,
  pageSize,
  className,
}: {
  items: ReactNode[];
  pageSize: number;
  className?: string;
}) {
  const [requested, setRequested] = useState(1);
  const { items: visible, ...page } = paginate(items, requested, pageSize);
  return (
    <>
      <ul className={className}>{visible}</ul>
      <Pagination
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
    </>
  );
}
