import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { INITIAL_STAGE_BY_ORIGIN, ROUTES } from "@/lib/constants/domain";
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
        className="-mt-2 flex items-center gap-1.5 text-[13px] text-muted-foreground"
      >
        <Link
          href={ROUTES.admin.clients}
          className="inline-flex min-h-11 items-center hover:underline"
        >
          {t.breadcrumb}
        </Link>
        <span aria-hidden="true">/</span>
        <span
          aria-current="page"
          className="truncate font-semibold text-foreground"
        >
          {name}
        </span>
      </nav>
      <div className="flex flex-wrap items-center gap-4">
        <span
          aria-hidden="true"
          className="flex size-15 shrink-0 items-center justify-center rounded-full bg-primary-tint text-xl font-bold text-primary-ink"
        >
          {initialsOf(client.firstName, client.lastName)}
        </span>
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-[28px] leading-tight font-bold tracking-tight">
            {name}
          </h1>
          <div className="flex flex-wrap items-center gap-2.5 text-[13.5px] text-muted-foreground">
            <StatusBadge status={client.accountStatus} />
            {client.activatedAt ? (
              <>
                <StatusBadge status={client.journeyStage} />
                <span>{t.activeSince(formatLongDate(client.activatedAt))}</span>
              </>
            ) : (
              <>
                <span>
                  {t.stageOnActivation(
                    copy.domain.journeyStage[
                      INITIAL_STAGE_BY_ORIGIN[client.origin]
                    ],
                  )}
                </span>
                <span>{t.notActiveYet}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
