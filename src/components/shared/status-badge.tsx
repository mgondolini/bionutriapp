import { cva } from "class-variance-authority";

import type { AccountStatus, JourneyStage } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import type { EntryAuthorBadge } from "@/lib/domain/tracking/labels";
import { cn } from "@/lib/utils";

export type BadgeStatus = AccountStatus | JourneyStage | EntryAuthorBadge;

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs leading-none font-semibold whitespace-nowrap",
  {
    variants: {
      status: {
        to_invite: "bg-muted text-secondary-foreground",
        invited: "bg-info text-info-foreground",
        // pesca: richiede attenzione (mockup v2)
        invite_expired: "bg-warm font-bold text-foreground",
        active: "bg-wash text-foreground",
        disabled: "border border-line-strong bg-card text-muted-foreground",
        onboarding: "border-[1.5px] border-warm bg-card text-foreground",
        in_progress: "bg-mint text-mint-foreground",
        paused: "bg-muted text-secondary-foreground",
        completed: "border border-line-strong bg-card text-muted-foreground",
        // autore di una registrazione del tracking (A-16)
        staff_created: "bg-info text-info-foreground",
        staff_edited: "bg-muted text-muted-foreground",
      } satisfies Record<BadgeStatus, string>,
    },
  },
);

const LABELS: Record<BadgeStatus, string> = {
  ...copy.domain.accountStatus,
  ...copy.domain.journeyStage,
  ...copy.tracking.author,
};

/**
 * Stato dell'account, fase del percorso o autore di una registrazione, con
 * colore ed etichetta dal dominio.
 */
export function StatusBadge({
  status,
  className,
}: {
  status: BadgeStatus;
  className?: string;
}) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)}>
      {LABELS[status]}
    </span>
  );
}
