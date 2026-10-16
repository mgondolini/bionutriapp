import type { ClientListItem } from "@/lib/clients/list-filters";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";

import { ClientRowActions } from "./client-row-actions";
import {
  ClientIdentity,
  LastEntry,
  LastFile,
  PhoneText,
  StatusAndStage,
  fullName,
  isHighlighted,
} from "./client-list-parts";

const t = copy.admin.clients.table;

/** Elenco clienti a card, sotto i 768 px (NF-08). */
export function ClientsCards({ items }: { items: ClientListItem[] }) {
  return (
    <ul className="flex flex-col gap-3 md:hidden" aria-label={t.caption}>
      {items.map((item) => (
        <li
          key={item.id}
          data-onboarding={isHighlighted(item) || undefined}
          className={cn(
            "flex flex-col gap-3 rounded-xl border bg-card p-4",
            isHighlighted(item) &&
              "border-warning-foreground/30 bg-warning/40 shadow-[inset_4px_0_0_var(--warning-foreground)]",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-1">
              <ClientIdentity item={item} />
              <PhoneText
                phone={item.phone}
                className="pl-13 text-sm text-muted-foreground"
              />
            </div>
            <StatusAndStage item={item} />
          </div>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{t.lastFile}</dt>
              <dd className="min-w-0">
                <LastFile item={item} />
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted-foreground">{t.lastEntry}</dt>
              <dd>
                <LastEntry item={item} />
              </dd>
            </div>
          </dl>
          <ClientRowActions
            clientId={item.id}
            name={fullName(item)}
            accountStatus={item.accountStatus}
          />
        </li>
      ))}
    </ul>
  );
}
