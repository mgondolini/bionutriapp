/**
 * Sessioni del percorso (A17, C19): data effettiva, stato mostrato,
 * numerazione, avanzamento e ricalcolo (DEV-10).
 */
import type {
  JourneyDuration,
  JourneySessionStatus,
  JourneySessionType,
} from "@/lib/constants/domain";

import type { JourneyComposition, PlannedSession } from "./composition";
import { buildSessions } from "./composition";
import { calculateSessionDates, monthsBetween } from "./dates";

export type JourneySession = {
  id: string;
  position: number;
  type: JourneySessionType;
  calculatedDate: string;
  /** Data scelta dal nutrizionista; null = vale quella calcolata. */
  customDate: string | null;
  /** "HH:MM", facoltativa. */
  time: string | null;
  status: JourneySessionStatus;
};

export type DatedSession<T extends JourneySession = JourneySession> = T & {
  /** Data effettiva: modificata se c'è, altrimenti calcolata. */
  date: string;
  modified: boolean;
};

export function mergeCustomDates<T extends JourneySession>(
  sessions: readonly T[],
): DatedSession<T>[] {
  return [...sessions]
    .sort((a, b) => a.position - b.position)
    .map((session) => ({
      ...session,
      date: session.customDate ?? session.calculatedDate,
      // fissata a mano: resta ferma ai ricalcoli anche se coincide con la calcolata
      modified: session.customDate !== null,
    }));
}

/** Stato mostrato: i due intermedi ("prossima", "in ritardo") non si salvano. */
export type SessionState = "done" | "skipped" | "next" | "overdue" | "todo";

/** La prima sessione da fare con data da oggi in poi (per data, poi posizione). */
export function firstOpenId(
  sessions: readonly DatedSession[],
  today: string,
): string | null {
  const open = sessions
    .filter((session) => session.status === "todo" && session.date >= today)
    .sort((a, b) =>
      a.date === b.date ? a.position - b.position : a.date < b.date ? -1 : 1,
    );
  return open[0]?.id ?? null;
}

export function deriveSessionState(
  session: Pick<DatedSession, "id" | "status" | "date">,
  today: string,
  nextId: string | null,
): SessionState {
  if (session.status === "done") return "done";
  if (session.status === "skipped") return "skipped";
  if (session.date < today) return "overdue";
  return session.id === nextId ? "next" : "todo";
}

/**
 * Nome della sessione. Lo staff vede "Check omaggio" e i check numerati
 * senza l'omaggio; il cliente vede l'omaggio come un check qualsiasi
 * (Check 1, Check 2…), senza sapere quale sia.
 */
export type SessionName =
  { kind: "onboarding" } | { kind: "gift" } | { kind: "check"; number: number };

export function sessionNames(
  sessions: readonly Pick<JourneySession, "id" | "position" | "type">[],
  audience: "staff" | "client",
): Map<string, SessionName> {
  const names = new Map<string, SessionName>();
  let number = 0;
  for (const session of [...sessions].sort((a, b) => a.position - b.position)) {
    if (session.type === "onboarding") {
      names.set(session.id, { kind: "onboarding" });
    } else if (session.type === "gift" && audience === "staff") {
      names.set(session.id, { kind: "gift" });
    } else {
      number += 1;
      names.set(session.id, { kind: "check", number });
    }
  }
  return names;
}

export function completedCount(
  sessions: readonly Pick<JourneySession, "status">[],
): number {
  return sessions.filter((session) => session.status === "done").length;
}

/** "Mese X di Y": mesi interi dall'inizio + 1, fra 1 e la durata. */
export function journeyMonth(
  start: string,
  durationMonths: JourneyDuration,
  today: string,
): { current: number; total: number } {
  const current = Math.min(
    Math.max(monthsBetween(start, today) + 1, 1),
    durationMonths,
  );
  return { current, total: durationMonths };
}

/**
 * Pagina del cliente (C19): le sessioni chiuse più vecchie (completate o
 * saltate) si raccolgono in una riga; l'ultima chiusa e le successive
 * restano separate. Con una sola chiusa da raccogliere non c'è gruppo.
 */
export function groupClosedSessions<T extends Pick<JourneySession, "status">>(
  sessions: readonly T[],
): { grouped: T[]; rest: T[] } {
  let lastClosed = -1;
  sessions.forEach((session, index) => {
    if (session.status !== "todo") lastClosed = index;
  });
  const head = sessions.slice(0, Math.max(lastClosed, 0));
  const groupable =
    head.length >= 2 && head.every((session) => session.status !== "todo");
  return groupable
    ? { grouped: head, rest: sessions.slice(head.length) }
    : { grouped: [], rest: [...sessions] };
}

// ---------------------------------------------------------------------
// Ricalcolo (A17): durata o inizio cambiati
// ---------------------------------------------------------------------

export type ExistingSession = Pick<
  JourneySession,
  "id" | "position" | "type" | "calculatedDate" | "customDate" | "status"
>;

export type RecalcPlan = {
  /** Sessioni che restano, con la nuova data calcolata. */
  updates: { id: string; calculatedDate: string; type: JourneySessionType }[];
  /** Sessioni nuove (durata allungata). */
  inserts: (PlannedSession & { calculatedDate: string })[];
  /** Sessioni che spariscono (durata accorciata). */
  deletes: string[];
  /** Sessioni non toccate la cui data cambia. */
  recalculated: string[];
  /** Sessioni con data modificata a mano: restano dove sono. */
  fixed: string[];
  /** Accorciando si perderebbero sessioni già completate o saltate. */
  blocked: boolean;
};

export function planRecalc(
  existing: readonly ExistingSession[],
  composition: JourneyComposition,
  start: string,
): RecalcPlan {
  const planned = buildSessions(composition);
  const dates = calculateSessionDates(
    start,
    composition.durationMonths,
    planned.length,
  );
  const byPosition = new Map(existing.map((s) => [s.position, s]));
  const plan: RecalcPlan = {
    updates: [],
    inserts: [],
    deletes: [],
    recalculated: [],
    fixed: [],
    blocked: false,
  };
  planned.forEach((session, index) => {
    const calculatedDate = dates[index]!;
    const current = byPosition.get(session.position);
    if (!current) {
      plan.inserts.push({ ...session, calculatedDate });
      return;
    }
    plan.updates.push({ id: current.id, calculatedDate, type: session.type });
    if (current.customDate !== null) plan.fixed.push(current.id);
    else if (current.calculatedDate !== calculatedDate)
      plan.recalculated.push(current.id);
  });
  for (const session of existing) {
    if (session.position >= planned.length) {
      plan.deletes.push(session.id);
      if (session.status !== "todo") plan.blocked = true;
    }
  }
  return plan;
}
