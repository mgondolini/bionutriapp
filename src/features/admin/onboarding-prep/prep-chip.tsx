import { Check, Camera, Ruler } from "lucide-react";

import { copy } from "@/lib/copy/it";
import type { PrepStatus } from "@/lib/onboarding-prep/status";
import { cn } from "@/lib/utils";

const t = copy.onboardingPrep.admin.chip;

/**
 * Sotto la fase dei clienti in Onboarding (A1): "Pronti" in Menta o cosa
 * manca in Pesca, sempre con un'icona oltre al colore.
 */
export function PrepChip({ status }: { status: PrepStatus }) {
  const label = status.complete
    ? t.ready
    : status.missing.length === 2
      ? t.both
      : t[status.missing[0]!];
  const Icon = status.complete
    ? Check
    : status.missing[0] === "measures"
      ? Ruler
      : Camera;
  return (
    <span
      className={cn(
        "inline-flex w-fit max-w-full items-start gap-1 rounded-[10px] px-2 py-0.5 text-[11.5px] leading-4 font-semibold text-foreground",
        status.complete ? "bg-mint" : "bg-warm",
      )}
    >
      <Icon
        aria-hidden="true"
        strokeWidth={1.8}
        className="mt-0.5 size-3 shrink-0"
      />
      {label}
    </span>
  );
}
