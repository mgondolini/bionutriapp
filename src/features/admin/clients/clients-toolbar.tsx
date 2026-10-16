"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ClientListFilters,
  FacetCounts,
} from "@/lib/clients/list-filters";
import { clientListUrl } from "@/lib/clients/list-url";
import {
  ACCOUNT_STATUSES,
  JOURNEY_STAGES,
  type AccountStatus,
  type JourneyStage,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";

const t = copy.admin.clients.toolbar;
const ALL = "all";
const SEARCH_DELAY_MS = 300;

type FacetSelectProps<T extends string> = {
  label: string;
  allLabel: string;
  values: readonly T[];
  labels: Record<T, string>;
  counts: Record<T | typeof ALL, number>;
  value: T | undefined;
  onChange: (value: T | undefined) => void;
};

/** Select di un filtro con il conteggio accanto a ogni opzione (A-02). */
function FacetSelect<T extends string>({
  label,
  allLabel,
  values,
  labels,
  counts,
  value,
  onChange,
}: FacetSelectProps<T>) {
  const id = useId();
  const items = [
    { value: ALL, label: t.option(allLabel, counts[ALL]) },
    ...values.map((v) => ({ value: v, label: t.option(labels[v], counts[v]) })),
  ];
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <Select
        items={items}
        value={value ?? ALL}
        onValueChange={(next) =>
          onChange(next === ALL || !next ? undefined : (next as T))
        }
      >
        <SelectTrigger
          id={id}
          className="h-11 w-full min-w-52 data-[size=default]:h-11 sm:w-auto"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              className="min-h-11"
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

type ClientsToolbarProps = {
  filters: ClientListFilters;
  counts: FacetCounts;
};

/** Filtri per stato e fase e ricerca: tutto nei searchParams dell'URL. */
export function ClientsToolbar({ filters, counts }: ClientsToolbarProps) {
  const router = useRouter();
  const searchId = useId();
  const [isPending, startTransition] = useTransition();

  // Il testo della ricerca segue l'URL (es. tasto Indietro) ma resta locale mentre si digita.
  const [query, setQuery] = useState(filters.query ?? "");
  const [urlQuery, setUrlQuery] = useState(filters.query ?? "");
  if ((filters.query ?? "") !== urlQuery) {
    setUrlQuery(filters.query ?? "");
    setQuery(filters.query ?? "");
  }

  // Un filtro scelto aggiunge una voce alla cronologia: Indietro lo annulla.
  const navigate = (next: ClientListFilters) =>
    startTransition(() => router.push(clientListUrl(next), { scroll: false }));

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
        "flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end",
        isPending && "opacity-80",
      )}
      aria-busy={isPending}
    >
      <FacetSelect<AccountStatus>
        label={t.statusLabel}
        allLabel={t.allStatuses}
        values={ACCOUNT_STATUSES}
        labels={copy.domain.accountStatus}
        counts={counts.status}
        value={filters.status}
        onChange={(status) => navigate({ ...filters, status })}
      />
      <FacetSelect<JourneyStage>
        label={t.stageLabel}
        allLabel={t.allStages}
        values={JOURNEY_STAGES}
        labels={copy.domain.journeyStage}
        counts={counts.stage}
        value={filters.stage}
        onChange={(stage) => navigate({ ...filters, stage })}
      />
      <div className="flex flex-1 flex-col gap-1.5 md:min-w-64">
        <label htmlFor={searchId} className="text-sm font-medium">
          {t.searchLabel}
        </label>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t.searchPlaceholder}
            className="bg-card pl-9"
          />
        </div>
      </div>
    </div>
  );
}
