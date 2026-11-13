import { Check, Lock, Ruler, Camera, type LucideIcon } from "lucide-react";

import { copy } from "@/lib/copy/it";
import { dayInRome, formatDayMonthLong, formatTimeInRome } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PrepView } from "@/server/services/onboarding-prep.service";

const t = copy.onboardingPrep;

type BadgeState = "todo" | "done" | "draft" | "saved";

/**
 * Stato di un'attività: "Da fare" e "Bozza" in Pesca (richiede attenzione),
 * "Fatto" e "Salvate" sulla tinta, sempre con il testo e un'icona.
 */
export function PrepBadge({
  state,
  count,
}: {
  state: BadgeState;
  /** Foto caricate, per "Bozza · 2 di 3". */
  count?: number;
}) {
  const Icon: LucideIcon | null =
    state === "done" ? Check : state === "saved" ? Lock : null;
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] leading-[18px] font-semibold whitespace-nowrap text-foreground",
        state === "done" || state === "saved" ? "bg-wash" : "bg-warm",
      )}
    >
      {Icon ? (
        <Icon aria-hidden="true" strokeWidth={1.8} className="size-3.5" />
      ) : null}
      {state === "draft" && count !== undefined
        ? t.photos.draft(count)
        : t.state[state]}
    </span>
  );
}

/** "13 ottobre" da un timestamp, nel giorno di Roma. */
export function dayOf(timestamp: string): string {
  return formatDayMonthLong(dayInRome(timestamp));
}

export function timeOf(timestamp: string): string {
  return formatTimeInRome(timestamp);
}

/** "7 misure · inviate il 13 ottobre" oppure "7 misure". */
export function measuresSummary(prep: PrepView): string {
  const total = prep.measures.total;
  return prep.status.measures === "done" && prep.measures.sentAt
    ? t.measures.summarySent(total, dayOf(prep.measures.sentAt))
    : t.measures.summaryTodo(total);
}

/** Badge della riga delle foto. */
export function photosBadge(prep: PrepView) {
  return prep.status.photos === "saved" ? (
    <PrepBadge state="saved" />
  ) : prep.status.photos === "draft" ? (
    <PrepBadge state="draft" count={prep.photos.count} />
  ) : (
    <PrepBadge state="todo" />
  );
}

/** Le due attività in riga (card della home, C4). */
export function PrepTaskRows({ prep }: { prep: PrepView }) {
  const rows: {
    key: string;
    icon: LucideIcon;
    title: string;
    summary: string;
    done: boolean;
    badge: React.ReactNode;
  }[] = [
    {
      key: "measures",
      icon: Ruler,
      title: t.measures.title,
      summary: measuresSummary(prep),
      done: prep.status.measures === "done",
      badge: <PrepBadge state={prep.status.measures} />,
    },
    {
      key: "photos",
      icon: Camera,
      title: t.photos.title,
      summary: t.photos.summary,
      done: prep.status.photos === "saved",
      badge: photosBadge(prep),
    },
  ];
  return (
    <ul className="flex flex-col divide-y divide-admin-line overflow-hidden rounded-[14px] border border-admin-line">
      {rows.map(({ key, icon: Icon, title, summary, done, badge }) => (
        <li key={key} className="flex min-h-15 items-center gap-3 px-3.5 py-3">
          <span
            aria-hidden="true"
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full",
              done ? "bg-primary text-primary-foreground" : "bg-warm",
            )}
          >
            {done ? (
              <Check strokeWidth={1.8} className="size-4" />
            ) : (
              <Icon strokeWidth={1.8} className="size-4" />
            )}
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <b className="text-[14.5px]">{title}</b>
            <span className="text-[13px] text-admin-muted">{summary}</span>
          </span>
          {badge}
        </li>
      ))}
    </ul>
  );
}
