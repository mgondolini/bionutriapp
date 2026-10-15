import { cva } from "class-variance-authority";

import type { AccountStatus, JourneyStage } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";

export type BadgeStatus = AccountStatus | JourneyStage;

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      status: {
        to_invite: "bg-muted text-muted-foreground",
        invited: "bg-info text-info-foreground",
        invite_expired: "bg-warning text-warning-foreground",
        active: "bg-success text-success-foreground",
        disabled: "bg-muted text-muted-foreground line-through",
        onboarding: "bg-warning text-warning-foreground",
        in_progress: "bg-success text-success-foreground",
        paused: "bg-info text-info-foreground",
        completed: "bg-muted text-muted-foreground",
      } satisfies Record<BadgeStatus, string>,
    },
  },
);

const LABELS: Record<BadgeStatus, string> = {
  ...copy.domain.accountStatus,
  ...copy.domain.journeyStage,
};

/** Stato dell'account o fase del percorso, con colore ed etichetta dal dominio. */
export function StatusBadge({
  status,
  className,
}: {
  status: BadgeStatus;
  className?: string;
}) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)}>
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {LABELS[status]}
    </span>
  );
}
