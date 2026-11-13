import Link from "next/link";

import { PhotoProgress } from "@/components/shared/photos/photo-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { PREP_TASKS, ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { deadlineText } from "@/lib/onboarding-prep/labels";
import { cn } from "@/lib/utils";
import type { PrepView } from "@/server/services/onboarding-prep.service";

import { PrepTaskRows } from "./prep-parts";

const t = copy.onboardingPrep;

/** Card "Prepara la chiamata" della home in Onboarding (C4). */
export function PrepHomeCard({ prep }: { prep: PrepView }) {
  const { status } = prep;
  return (
    <section
      aria-labelledby="prep-card"
      className="flex flex-col gap-3 rounded-[20px] border border-admin-line bg-card p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <h2 id="prep-card" className="text-[17px] font-bold">
            {t.title}
          </h2>
          <span className="text-[13px] text-admin-muted">
            {prep.call
              ? t.deadline(deadlineText(prep.call.date))
              : t.noCallDate}
          </span>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[12px] font-semibold whitespace-nowrap",
            status.complete ? "bg-mint" : "bg-warm",
          )}
        >
          {t.tasksDone(status.done, PREP_TASKS.length)}
        </span>
      </div>
      <PhotoProgress count={status.done} total={PREP_TASKS.length} />
      <PrepTaskRows prep={prep} />
      <Link
        href={ROUTES.client.prep}
        className={cn(
          buttonVariants({
            variant: status.complete ? "outline" : "default",
            size: "lg",
          }),
          "w-full",
        )}
      >
        {status.complete ? t.home.review : t.home.continue}
      </Link>
    </section>
  );
}
