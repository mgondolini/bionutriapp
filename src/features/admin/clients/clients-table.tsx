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
} from "./client-list-parts";

const t = copy.admin.clients.table;

/** Intestazione su tinta, testo Profondo 12px (mockup-v2-admin). */
const HEAD = "h-10 bg-wash px-6 text-xs font-semibold text-foreground";
const CELL = "px-6 py-3.5";

/** Elenco clienti in tabella, da 768 px in su (A-01). */
export function ClientsTable({ items }: { items: ClientListItem[] }) {
  return (
    <div className="hidden overflow-hidden rounded-[20px] border border-admin-line bg-card md:block">
      <Table className="table-fixed">
        <TableCaption className="sr-only">{t.caption}</TableCaption>
        <TableHeader>
          <TableRow className="border-admin-line hover:bg-transparent">
            <TableHead className={cn(HEAD, "w-[22%]")}>{t.client}</TableHead>
            <TableHead className={cn(HEAD, "w-[12%]")}>{t.status}</TableHead>
            <TableHead className={cn(HEAD, "w-[12%]")}>{t.stage}</TableHead>
            <TableHead className={HEAD}>{t.lastFile}</TableHead>
            <TableHead className={cn(HEAD, "w-[11%]")}>{t.lastEntry}</TableHead>
            <TableHead
              className={cn(HEAD, "w-[170px] pl-0 text-right xl:w-[280px]")}
            >
              <span className="sr-only">{t.actions}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className="border-admin-line bg-card hover:bg-admin-row-hover"
            >
              <TableCell className={CELL}>
                <ClientIdentity item={item} />
              </TableCell>
              <TableCell className={CELL}>
                <StatusBadge status={item.accountStatus} />
              </TableCell>
              <TableCell className={CELL}>
                <StatusBadge status={item.journeyStage} />
              </TableCell>
              <TableCell className={cn(CELL, "whitespace-normal")}>
                <LastFile item={item} />
              </TableCell>
              <TableCell className={cn(CELL, "whitespace-normal")}>
                <LastEntry item={item} />
              </TableCell>
              <TableCell className={cn(CELL, "pl-0")}>
                <ClientRowActions
                  clientId={item.id}
                  name={fullName(item)}
                  accountStatus={item.accountStatus}
                  className="justify-end xl:flex-nowrap"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="border-t border-admin-line px-6 py-3.5 text-[13px] text-admin-muted">
        {t.footer(items.length)}
      </p>
    </div>
  );
}
