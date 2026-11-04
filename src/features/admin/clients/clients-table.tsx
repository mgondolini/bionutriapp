import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClientListItem } from "@/lib/clients/list-filters";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";

import { StatusBadge } from "@/components/shared/status-badge";

import { ClientRowActions } from "./client-row-actions";
import {
  ClientIdentity,
  LastEntry,
  LastFile,
  fullName,
  isHighlighted,
} from "./client-list-parts";

const t = copy.admin.clients.table;

/** Elenco clienti in tabella, da 768 px in su (A-01). */
export function ClientsTable({ items }: { items: ClientListItem[] }) {
  return (
    <div className="hidden overflow-hidden rounded-[14px] border bg-card md:block">
      <Table className="table-fixed">
        <TableCaption className="sr-only">{t.caption}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[24%]">{t.client}</TableHead>
            <TableHead className="w-[12%]">{t.status}</TableHead>
            <TableHead className="w-[12%]">{t.stage}</TableHead>
            <TableHead>{t.lastFile}</TableHead>
            <TableHead className="w-[13%]">{t.lastEntry}</TableHead>
            <TableHead className="w-[150px] text-right xl:w-[220px]">
              <span className="sr-only">{t.actions}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              data-onboarding={isHighlighted(item) || undefined}
              className={cn(
                isHighlighted(item) &&
                  "bg-warm-soft shadow-[inset_4px_0_0_var(--warm)] hover:bg-warm-soft",
              )}
            >
              <TableCell>
                <ClientIdentity item={item} />
              </TableCell>
              <TableCell>
                <StatusBadge status={item.accountStatus} />
              </TableCell>
              <TableCell>
                <StatusBadge status={item.journeyStage} />
              </TableCell>
              <TableCell className="whitespace-normal">
                <LastFile item={item} />
              </TableCell>
              <TableCell className="whitespace-normal">
                <LastEntry item={item} />
              </TableCell>
              <TableCell>
                <ClientRowActions
                  clientId={item.id}
                  name={fullName(item)}
                  accountStatus={item.accountStatus}
                  className="flex-col items-end"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="border-t px-5 py-3.5 text-[13px] text-muted-foreground">
        {t.footer(items.length)}
      </p>
    </div>
  );
}
