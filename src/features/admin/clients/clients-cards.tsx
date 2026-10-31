import type { ClientListItem } from "@/lib/clients/list-filters";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";

import { ClientRowActions } from "./client-row-actions";
import {
  ClientIdentity,
  LastEntry,
  LastFile,
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
            "flex flex-col gap-3 rounded-[14px] border bg-card p-4",
            isHighlighted(item) &&
              "bg-[#fff9f1] shadow-[inset_4px_0_0_#d9a066]",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <ClientIdentity item={item} />
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
