"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import {
  QUICK_FILTERS,
  activeQuickFilter,
  quickFilterFilters,
  type ClientListFilters,
  type QuickFilter,
  type QuickFilterCounts,
} from "@/lib/clients/list-filters";
import { clientListUrl } from "@/lib/clients/list-url";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";

const t = copy.admin.clients.toolbar;
const SEARCH_DELAY_MS = 300;

const QUICK_FILTER_LABELS: Record<QuickFilter, string> = {
  all: t.all,
  in_progress: copy.domain.journeyStage.in_progress,
  onboarding: copy.domain.journeyStage.onboarding,
  invite_expired: copy.domain.accountStatus.invite_expired,
};

type ClientsToolbarProps = {
  filters: ClientListFilters;
  counts: QuickFilterCounts;
};

/**
 * Pill di filtro con il conteggio e ricerca (A-02, A-03, mockup-v2-admin):
 * tutto nei searchParams dell'URL. Le pill sono link (Indietro annulla la
 * scelta), tengono la ricerca e azzerano gli altri filtri e la pagina.
 */
export function ClientsToolbar({ filters, counts }: ClientsToolbarProps) {
  const router = useRouter();
  const searchId = useId();
  const [isPending, startTransition] = useTransition();
  const active = activeQuickFilter(filters);

  // Il testo della ricerca segue l'URL (es. tasto Indietro) ma resta locale mentre si digita.
  const [query, setQuery] = useState(filters.query ?? "");
  const [urlQuery, setUrlQuery] = useState(filters.query ?? "");
  if ((filters.query ?? "") !== urlQuery) {
    setUrlQuery(filters.query ?? "");
    setQuery(filters.query ?? "");
  }

  // La ricerca sostituisce la voce corrente, con un breve ritardo mentre si digita.
  useEffect(() => {
    if (query.trim() === (filters.query ?? "")) return;
    const timer = setTimeout(() => {
      startTransition(() =>
        router.replace(clientListUrl({ ...filters, query }), { scroll: false }),
      );
    }, SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [query, filters, router]);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-3",
        isPending && "opacity-80",
      )}
      aria-busy={isPending}
    >
      <nav aria-label={t.filterLabel}>
        <ul className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map((key) => {
            const selected = key === active;
            return (
              <li key={key}>
                <Link
                  href={clientListUrl(quickFilterFilters(key, filters.query))}
                  scroll={false}
                  aria-current={selected ? "true" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] px-4 text-sm text-foreground transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    selected
                      ? "border-action bg-wash font-bold"
                      : "border-admin-field bg-card font-semibold hover:bg-admin-hover",
                  )}
                >
                  {QUICK_FILTER_LABELS[key]}
                  <span className="font-semibold text-admin-muted tabular-nums">
                    {counts[key]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="relative w-full sm:max-w-[380px] sm:flex-[1_1_280px]">
        <label htmlFor={searchId} className="sr-only">
          {t.searchLabel}
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3.5 size-[18px] -translate-y-1/2 text-foreground"
        />
        <Input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t.searchPlaceholder}
          className="rounded-[14px] border-[1.5px] border-admin-field pl-10.5"
        />
      </div>
    </div>
  );
}
