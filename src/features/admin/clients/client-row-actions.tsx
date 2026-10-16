"use client";

import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  INVITABLE_STATUSES,
  clientDetailPath,
  type AccountStatus,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";
import { sendWhatsAppInviteAction } from "@/server/actions/invites.actions";

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
  const [isPending, startTransition] = useTransition();
  const canInvite = INVITABLE_STATUSES.includes(accountStatus);
  const inviteLabel = accountStatus === "to_invite" ? t.invite : t.reinvite;

  const invite = () =>
    startTransition(async () => {
      const result = await sendWhatsAppInviteAction({ clientId });
      if (result.ok) window.open(result.data.whatsappUrl, "_blank", "noopener");
      else toast.error(result.error);
    });

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {canInvite ? (
        <Button
          type="button"
          onClick={invite}
          disabled={isPending}
          aria-label={t.inviteFor(name)}
        >
          <MessageCircle aria-hidden="true" />
          {inviteLabel}
        </Button>
      ) : null}
      <Link
        href={clientDetailPath(clientId)}
        aria-label={t.detailFor(name)}
        className={buttonVariants({ variant: "outline" })}
      >
        {t.detail}
      </Link>
    </div>
  );
}
