import { StatusBadge } from "@/components/shared/status-badge";
import type { ClientListItem } from "@/lib/clients/list-filters";
import { copy } from "@/lib/copy/it";
import { formatShortDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { initialsOf } from "@/lib/studio/branding";
import { cn } from "@/lib/utils";

const t = copy.admin.clients.table;

export function fullName(
  item: Pick<ClientListItem, "firstName" | "lastName">,
): string {
  return [item.firstName, item.lastName].filter(Boolean).join(" ");
}

/** I clienti in Onboarding sono evidenziati (A-02). */
export function isHighlighted(item: ClientListItem): boolean {
  return item.journeyStage === "onboarding";
}

export function ClientIdentity({ item }: { item: ClientListItem }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold"
      >
        {initialsOf(item.firstName, item.lastName)}
      </span>
      <span className="truncate font-semibold">{fullName(item)}</span>
    </div>
  );
}

export function PhoneText({
  phone,
  className,
}: {
  phone: string;
  className?: string;
}) {
  return (
    <span className={cn("whitespace-nowrap tabular-nums", className)}>
      {formatPhone(phone)}
    </span>
  );
}

/** Stato account con la fase sotto (A-01). */
export function StatusAndStage({ item }: { item: ClientListItem }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <StatusBadge status={item.accountStatus} />
      <StatusBadge status={item.journeyStage} />
    </div>
  );
}

export function LastFile({ item }: { item: ClientListItem }) {
  if (!item.lastFile)
    return <span className="text-muted-foreground">{t.noFile}</span>;
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate font-medium">{item.lastFile.title}</span>
      <span className="text-xs text-muted-foreground">
        {copy.domain.fileCategory[item.lastFile.category]}
        {" · "}
        {formatShortDate(item.lastFile.uploadedAt)}
      </span>
    </div>
  );
}

export function LastEntry({ item }: { item: ClientListItem }) {
  if (!item.lastEntryOn)
    return <span className="text-muted-foreground">{t.noEntry}</span>;
  return (
    <span className="whitespace-nowrap">
      {formatShortDate(item.lastEntryOn)}
    </span>
  );
}
