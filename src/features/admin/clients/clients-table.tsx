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

/** Elenco clienti in tabella, da 768 px in su (A-01). */
export function ClientsTable({ items }: { items: ClientListItem[] }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
      <Table>
        <TableCaption className="sr-only">{t.caption}</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="px-4">{t.client}</TableHead>
            <TableHead>{t.phone}</TableHead>
            <TableHead>{t.status}</TableHead>
            <TableHead>{t.lastFile}</TableHead>
            <TableHead>{t.lastEntry}</TableHead>
            <TableHead className="px-4 text-right">{t.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              data-onboarding={isHighlighted(item) || undefined}
              className={cn(
                isHighlighted(item) &&
                  "bg-warning/40 shadow-[inset_4px_0_0_var(--warning-foreground)] hover:bg-warning/60",
              )}
            >
              <TableCell className="max-w-64 px-4 py-3">
                <ClientIdentity item={item} />
              </TableCell>
              <TableCell>
                <PhoneText phone={item.phone} />
              </TableCell>
              <TableCell>
                <StatusAndStage item={item} />
              </TableCell>
              <TableCell className="max-w-64">
                <LastFile item={item} />
              </TableCell>
              <TableCell>
                <LastEntry item={item} />
              </TableCell>
              <TableCell className="px-4">
                <ClientRowActions
                  clientId={item.id}
                  name={fullName(item)}
                  accountStatus={item.accountStatus}
                  className="justify-end"
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
