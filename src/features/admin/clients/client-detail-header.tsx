import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatLongDate } from "@/lib/format";
import { initialsOf } from "@/lib/studio/branding";
import type { ClientHeader } from "@/server/services/clients.service";

const t = copy.admin.clients.detail;

/** Intestazione della scheda cliente (A4): nome, stato account e fase. */
export function ClientDetailHeader({ client }: { client: ClientHeader }) {
  const name = [client.firstName, client.lastName].filter(Boolean).join(" ");
  return (
    <header className="flex flex-col gap-4">
      <nav
        aria-label={t.breadcrumb}
        className="flex items-center gap-1 text-sm text-muted-foreground"
      >
        <Link
          href={ROUTES.admin.clients}
          className="inline-flex min-h-11 items-center hover:underline"
        >
          {t.breadcrumb}
        </Link>
        <ChevronRight aria-hidden="true" className="size-4" />
        <span aria-current="page" className="truncate text-foreground">
          {name}
        </span>
      </nav>
      <div className="flex flex-wrap items-center gap-4">
        <span
          aria-hidden="true"
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-secondary text-lg font-semibold"
        >
          {initialsOf(client.firstName, client.lastName)}
        </span>
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={client.accountStatus} />
            <StatusBadge status={client.journeyStage} />
            {client.activatedAt ? (
              <span className="text-sm text-muted-foreground">
                {t.activeSince(formatLongDate(client.activatedAt))}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
