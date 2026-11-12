import { Check, Clock, Gift, Minus, TriangleAlert } from "lucide-react";

import { PhotoMark } from "@/components/shared/photos/photo-mark";

import { copy } from "@/lib/copy/it";
import type { SessionState } from "@/lib/domain/journeys/sessions";
import { daysBetween } from "@/lib/domain/tracking/dates";
import { sessionLabel } from "@/lib/domain/journeys/labels";
import { formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StaffSessionView } from "@/server/services/journeys.service";

const t = copy.journeys;

const SQUARE: Record<SessionState, string> = {
  done: "border-mint bg-mint",
  skipped: "border-admin-line bg-muted",
  next: "border-action bg-card",
  overdue: "border-warm bg-warm-soft",
  todo: "border-admin-line bg-card",
};

function StateIcon({ session }: { session: StaffSessionView }) {
  const Icon =
    session.state === "done"
      ? Check
      : session.state === "skipped"
        ? Minus
        : session.state === "overdue"
          ? TriangleAlert
          : session.type === "gift"
            ? Gift
            : Clock;
  return (
    <span
      className={cn(
        "flex size-7 items-center justify-center rounded-full",
        session.state === "done"
          ? "bg-foreground text-white"
          : "bg-muted text-foreground",
      )}
    >
      <Icon aria-hidden="true" className="size-4" />
    </span>
  );
}

/** Etichetta sotto la data: le completate hanno solo data e spunta. */
function stateText(session: StaffSessionView, today: string): string | null {
  switch (session.state) {
    case "done":
      return null;
    case "next":
      return t.admin.nextIn(daysBetween(today, session.date));
    default:
      return t.state[session.state];
  }
}

/**
 * Quadrato di una sessione (A17, A19): icona di stato, nome, data, etichetta,
 * "Modificata" se la data è stata cambiata a mano e "Omaggio" (solo staff).
 * Lo stato è sempre scritto o con un'icona, mai solo nel colore.
 */
export function SessionSquareContent({
  session,
  today,
}: {
  session: StaffSessionView;
  today: string;
}) {
  const label = stateText(session, today);
  // Nel DOM prima nome, data e stato (nome accessibile del pulsante), poi le
  // etichette; l'ordine visivo resta quello del mockup.
  return (
    <>
      <span className="order-2 mt-auto flex flex-col gap-0.5 pt-6 text-left">
        <span className="text-[17px] leading-tight font-bold">
          {sessionLabel(session.name)}
        </span>
        <span className="text-sm">{formatShortDate(session.date)}</span>
        {label ? (
          <span className="text-xs font-semibold text-admin-muted">
            {label}
          </span>
        ) : (
          <span className="sr-only">{t.state.done}</span>
        )}
      </span>
      <span className="order-1 flex items-start justify-between gap-2">
        <StateIcon session={session} />
        <span className="flex flex-wrap justify-end gap-1">
          {session.photo && session.photo !== "skipped" ? (
            <PhotoMark state={session.photo} />
          ) : null}
          {session.type === "gift" ? (
            <span className="rounded-full bg-warm px-2 py-0.5 text-[11px] font-bold text-foreground">
              {t.admin.gift}
            </span>
          ) : null}
          {session.modified ? (
            <span className="rounded-full bg-warm px-2 py-0.5 text-[11px] font-bold text-foreground">
              {t.admin.modified}
            </span>
          ) : null}
        </span>
      </span>
    </>
  );
}

export function sessionSquareClass(
  state: SessionState,
  selected: boolean,
): string {
  return cn(
    "flex min-h-[150px] flex-col rounded-2xl border-[1.5px] p-4 text-foreground",
    SQUARE[state],
    selected && "ring-[3px] ring-foreground ring-offset-2",
  );
}
