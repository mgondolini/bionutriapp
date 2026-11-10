import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
  INVITABLE_STATUSES,
  clientDetailPath,
  type AccountStatus,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";

import { WhatsAppInviteButton } from "./whatsapp-invite-button";

const t = copy.admin.clients.actions;

type ClientRowActionsProps = {
  clientId: string;
  name: string;
  accountStatus: AccountStatus;
  className?: string;
};

/**
 * Azioni della riga (A-01, N-01): "Invia invito su WhatsApp" come azione
 * principale per i clienti non ancora attivi, "Dettaglio" per tutti.
 */
export function ClientRowActions({
  clientId,
  name,
  accountStatus,
  className,
}: ClientRowActionsProps) {
  const canInvite = INVITABLE_STATUSES.includes(accountStatus);
  const inviteLabel = accountStatus === "to_invite" ? t.invite : t.reinvite;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {canInvite ? (
        <WhatsAppInviteButton
          clientId={clientId}
          name={name}
          label={inviteLabel}
          ariaLabel={t.inviteFor(inviteLabel, name)}
          variant="action"
          className="rounded-xl"
        />
      ) : null}
      <Link
        href={clientDetailPath(clientId)}
        aria-label={t.detailFor(name)}
        className={buttonVariants({
          variant: "ghost",
          size: "sm",
          className: "rounded-xl font-bold text-foreground hover:bg-wash",
        })}
      >
        {t.detail}
        <ChevronRight aria-hidden="true" className="size-3.5" />
      </Link>
    </div>
  );
}
