import "server-only";

import type { PhotoSetState } from "@/lib/photos/status";

import {
  JOURNEY_EXTENSION_THRESHOLD_DAYS,
  type JourneyDuration,
  type JourneyGiftMode,
  type JourneyKind,
  type JourneySessionStatus,
  type JourneySessionType,
  type JourneyStatus,
  type JourneyStage,
  type MeetingSource,
} from "@/lib/constants/domain";
import { planJourney } from "@/lib/domain/journeys/composition";
import { journeyEndDate } from "@/lib/domain/journeys/dates";
import {
  completedCount,
  deriveSessionState,
  firstOpenId,
  journeyMonth,
  mergeCustomDates,
  planRecalc,
  sessionNames,
  type SessionName,
  type SessionState,
} from "@/lib/domain/journeys/sessions";
import { daysBetween, todayInRome } from "@/lib/domain/tracking/dates";
import { photoSessionsOfJourney } from "@/lib/photos/checks";
import * as clientsRepository from "@/server/repositories/clients.repository";
import * as journeysRepository from "@/server/repositories/journeys.repository";
import * as photosRepository from "@/server/repositories/photos.repository";
import { notifySessionsChanged } from "@/server/services/journey-notifications.service";

/*
 * Percorso del cliente (mockup v5). Le date e gli stati si calcolano con le
 * funzioni pure di src/lib/domain/journeys; qui si leggono e si scrivono
 * percorsi e sessioni, si verifica lo studio e si avvisa il cliente quando
 * la data effettiva di una sessione cambia.
 */

// ---------------------------------------------------------------------
// Viste
// ---------------------------------------------------------------------

export type StaffSessionView = {
  id: string;
  position: number;
  type: JourneySessionType;
  name: SessionName;
  calculatedDate: string;
  customDate: string | null;
  date: string;
  modified: boolean;
  time: string | null;
  status: JourneySessionStatus;
  state: SessionState;
  note: string | null;
  /** Link Meet di questa sessione (uno per check). */
  meetingUrl: string | null;
  /** Check con le foto: stato del set per il segno "Foto" (A17); aggiunto dalla pagina. */
  photo?: PhotoSetState;
  meetingSource: MeetingSource | null;
};

export type StaffJourneyView = {
  id: string;
  number: number;
  kind: JourneyKind;
  durationMonths: JourneyDuration;
  startDate: string;
  endDate: string;
  includeOnboarding: boolean;
  giftMode: JourneyGiftMode;
  status: JourneyStatus;
  concludedAt: string | null;
  /** Giorno da cui contare "concluso da N giorni" (fine o conclusione, la prima). */
  concludedOn: string | null;
  createdAt: string;
  previousJourneyId: string | null;
  sessions: StaffSessionView[];
  completed: number;
  /** Alla creazione il cliente è tornato In percorso in automatico (storico fasi). */
  autoStageChanged: boolean;
};

export type StaffJourneys = {
  client: {
    id: string;
    firstName: string;
    lastName: string;
    /** Invitata dall'evento del calendario dello staff (A17). */
    email: string | null;
    stage: JourneyStage;
    pushEnabled: boolean;
  };
  /** Dal più recente. */
  journeys: StaffJourneyView[];
  today: string;
  threshold: number;
};

/** Ora "HH:MM" dal database ("10:30:00"). */
function shortTime(time: string | null): string | null {
  return time ? time.slice(0, 5) : null;
}

function dayOf(timestamp: string): string {
  return todayInRome(new Date(timestamp));
}

type JourneyRow = Awaited<
  ReturnType<typeof journeysRepository.listJourneysOfClient>
>[number];

function toStaffJourney(
  row: JourneyRow,
  number: number,
  today: string,
): StaffJourneyView {
  const dated = mergeCustomDates(
    row.journey_sessions.map((session) => ({
      id: session.id,
      position: session.position,
      type: session.type as JourneySessionType,
      calculatedDate: session.calculated_date,
      customDate: session.custom_date,
      time: shortTime(session.session_time),
      status: session.status as JourneySessionStatus,
      note: session.note,
      meetingUrl: session.meeting_url,
      meetingSource: session.meeting_source as MeetingSource | null,
    })),
  );
  const names = sessionNames(dated, "staff");
  const nextId = row.status === "active" ? firstOpenId(dated, today) : null;
  const concludedOn = row.concluded_at
    ? [row.end_date, dayOf(row.concluded_at)].sort()[0]!
    : null;
  return {
    id: row.id,
    number,
    kind: row.kind as JourneyKind,
    durationMonths: row.duration_months as JourneyDuration,
    startDate: row.start_date,
    endDate: row.end_date,
    includeOnboarding: row.include_onboarding,
    giftMode: row.gift_mode as JourneyGiftMode,
    status: row.status as JourneyStatus,
    concludedAt: row.concluded_at,
    concludedOn,
    createdAt: row.created_at,
    previousJourneyId: row.previous_journey_id,
    sessions: dated.map((session) => ({
      ...session,
      name: names.get(session.id)!,
      state: deriveSessionState(session, today, nextId),
    })),
    completed: completedCount(dated),
    autoStageChanged: false,
  };
}

/** Margine fra la creazione del percorso e il cambio di fase automatico. */
const AUTO_STAGE_WINDOW_MS = 5 * 60 * 1000;

async function loadOwnedClient(studioId: string, clientId: string) {
  const client = await clientsRepository.getClientProfile(clientId);
  return client?.studio_id === studioId ? client : null;
}

/** Scheda Percorso (A17–A19); null se il cliente non è dello studio. */
export async function getStaffJourneys(
  studioId: string,
  clientId: string,
): Promise<StaffJourneys | null> {
  const client = await loadOwnedClient(studioId, clientId);
  if (!client) return null;
  const [rows, history] = await Promise.all([
    journeysRepository.listJourneysOfClient(clientId),
    clientsRepository.listStageHistory(clientId),
  ]);
  const automaticResumes = history
    .filter(
      (event) =>
        event.to_stage === "in_progress" &&
        event.from_stage === "completed" &&
        event.source === "automatic" &&
        event.changed_at,
    )
    .map((event) => Date.parse(event.changed_at!));
  const today = todayInRome();
  return {
    client: {
      id: client.id!,
      firstName: client.first_name!,
      lastName: client.last_name ?? "",
      email: client.email,
      stage: client.journey_stage as JourneyStage,
      pushEnabled: Boolean(client.push_enabled),
    },
    journeys: rows
      .map((row, index) => {
        const view = toStaffJourney(row, index + 1, today);
        const created = Date.parse(row.created_at);
        view.autoStageChanged = automaticResumes.some(
          (at) => at >= created && at - created <= AUTO_STAGE_WINDOW_MS,
        );
        return view;
      })
      .reverse(),
    today,
    threshold: JOURNEY_EXTENSION_THRESHOLD_DAYS,
  };
}

// ---------------------------------------------------------------------
// Scritture dello staff
// ---------------------------------------------------------------------

export type JourneyFailure =
  | "not_found"
  | "already_active"
  | "concluded"
  | "previous_not_concluded"
  | "shorten_blocked"
  | "shorten_blocked_photos";

type Result<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; reason: JourneyFailure };

/**
 * Nuovo percorso (primo, estensione o ripresa) con le sessioni. Per un
 * cliente Concluso la fase torna In percorso in automatico, con lo storico
 * delle fasi (set_journey_stage, origine "automatic").
 */
export async function createJourney(
  studioId: string,
  input: {
    clientId: string;
    previousJourneyId: string | null;
    durationMonths: JourneyDuration;
    startDate: string;
    includeOnboarding: boolean;
    giftMode: JourneyGiftMode;
  },
): Promise<Result<{ journeyId: string; stageChanged: boolean }>> {
  const client = await loadOwnedClient(studioId, input.clientId);
  if (!client) return { ok: false, reason: "not_found" };
  if (await journeysRepository.hasActiveJourney(input.clientId)) {
    return { ok: false, reason: "already_active" };
  }

  let kind: JourneyKind = "first";
  if (input.previousJourneyId) {
    const previous = await journeysRepository.getJourney(
      input.previousJourneyId,
    );
    if (!previous || previous.client_id !== input.clientId) {
      return { ok: false, reason: "not_found" };
    }
    if (previous.status !== "concluded" || !previous.concluded_at) {
      return { ok: false, reason: "previous_not_concluded" };
    }
    const concludedOn = [
      previous.end_date,
      dayOf(previous.concluded_at),
    ].sort()[0]!;
    kind =
      daysBetween(concludedOn, todayInRome()) <=
      JOURNEY_EXTENSION_THRESHOLD_DAYS
        ? "extension"
        : "resume";
  }

  const sessions = planJourney(input, input.startDate);
  const created = await journeysRepository.createJourney({
    clientId: input.clientId,
    previousJourneyId: input.previousJourneyId,
    kind,
    durationMonths: input.durationMonths,
    startDate: input.startDate,
    endDate: journeyEndDate(input.startDate, input.durationMonths),
    includeOnboarding: input.includeOnboarding,
    giftMode: input.giftMode,
    sessions: sessions.map((session) => ({
      position: session.position,
      type: session.type,
      calculated_date: session.calculatedDate,
    })),
  });
  if (!created.ok) return { ok: false, reason: created.reason };

  let stageChanged = false;
  if (client.journey_stage === "completed") {
    stageChanged = await clientsRepository.setJourneyStage(
      input.clientId,
      "completed",
      "in_progress",
      true,
    );
  }
  return { ok: true, data: { journeyId: created.id, stageChanged } };
}

/**
 * Durata o data di inizio cambiate: le sessioni non toccate si ricalcolano,
 * quelle con la data modificata restano ferme. Chi ha una data effettiva
 * nuova (da oggi in poi, da fare) riceve l'avviso.
 */
export async function updateJourney(
  studioId: string,
  input: {
    journeyId: string;
    durationMonths: JourneyDuration;
    startDate: string;
  },
): Promise<Result<{ clientId: string }>> {
  const journey = await journeysRepository.getJourney(input.journeyId);
  if (!journey || journey.studio_id !== studioId) {
    return { ok: false, reason: "not_found" };
  }
  if (journey.status !== "active") return { ok: false, reason: "concluded" };

  const existing = journey.journey_sessions.map((session) => ({
    id: session.id,
    position: session.position,
    type: session.type as JourneySessionType,
    calculatedDate: session.calculated_date,
    customDate: session.custom_date,
    status: session.status as JourneySessionStatus,
  }));
  const plan = planRecalc(
    existing,
    {
      durationMonths: input.durationMonths,
      includeOnboarding: journey.include_onboarding,
      giftMode: journey.gift_mode as JourneyGiftMode,
    },
    input.startDate,
  );
  if (plan.blocked) return { ok: false, reason: "shorten_blocked" };
  // Le foto già caricate non si perdono e non si nascondono: un check da
  // togliere con foto, o un check con foto che smetterebbe di prevederle
  // (l'ultimo check si sposta cambiando la durata), blocca il ricalcolo.
  const sets = await photosRepository.listSetsOfClient(journey.client_id);
  const withPhotos = sets.filter(
    (set) =>
      set.photos.length > 0 &&
      existing.some((session) => session.id === set.session_id),
  );
  if (withPhotos.length > 0) {
    const positions = new Map(existing.map((s) => [s.id, s.position]));
    const after = [
      ...plan.updates.map((u) => ({
        id: u.id,
        type: u.type,
        position: positions.get(u.id)!,
      })),
      ...plan.inserts.map((i) => ({
        id: `new-${i.position}`,
        type: i.type,
        position: i.position,
      })),
    ];
    const photoIds = new Set(
      photoSessionsOfJourney(after).map(({ session }) => session.id),
    );
    if (withPhotos.some((set) => !photoIds.has(set.session_id))) {
      return { ok: false, reason: "shorten_blocked_photos" };
    }
  }

  await journeysRepository.updateJourneyDates(input.journeyId, {
    durationMonths: input.durationMonths,
    startDate: input.startDate,
    endDate: journeyEndDate(input.startDate, input.durationMonths),
  });
  await journeysRepository.applySessionPlan(input.journeyId, plan);

  const today = todayInRome();
  const changed = plan.recalculated.filter((id) => {
    const session = existing.find((item) => item.id === id)!;
    const next = plan.updates.find((update) => update.id === id)!;
    return session.status === "todo" && next.calculatedDate >= today;
  });
  notifySessionsChanged(changed);
  return { ok: true, data: { clientId: journey.client_id } };
}

type SessionRow = NonNullable<
  Awaited<ReturnType<typeof journeysRepository.getSession>>
>;

async function loadOwnedSession(
  studioId: string,
  sessionId: string,
): Promise<
  { ok: true; session: SessionRow } | { ok: false; reason: JourneyFailure }
> {
  const session = await journeysRepository.getSession(sessionId);
  if (!session || session.studio_id !== studioId) {
    return { ok: false, reason: "not_found" };
  }
  if (session.client_journeys.status !== "active") {
    return { ok: false, reason: "concluded" };
  }
  return { ok: true, session };
}

/**
 * Data, ora, stato e nota di una sessione. La data uguale a quella calcolata
 * non conta come modifica. Se data effettiva o ora cambiano, il cliente
 * riceve subito la push (anche per un ripristino).
 */
export async function updateSession(
  studioId: string,
  input: {
    sessionId: string;
    date: string;
    time: string | null;
    status: JourneySessionStatus;
    note: string | null;
  },
): Promise<Result<{ clientId: string }>> {
  const loaded = await loadOwnedSession(studioId, input.sessionId);
  if (!loaded.ok) return loaded;
  const { session } = loaded;
  const before = {
    date: session.custom_date ?? session.calculated_date,
    time: shortTime(session.session_time),
  };
  const customDate = input.date === session.calculated_date ? null : input.date;
  await journeysRepository.updateSession(input.sessionId, {
    customDate,
    time: input.time,
    status: input.status,
    note: input.note,
  });
  if (
    input.status === "todo" &&
    (before.date !== input.date || before.time !== input.time)
  ) {
    notifySessionsChanged([input.sessionId]);
  }
  return { ok: true, data: { clientId: session.client_id } };
}

/** "Ripristina la data calcolata": toglie la data modificata a mano. */
export async function restoreSessionDate(
  studioId: string,
  sessionId: string,
): Promise<Result<{ clientId: string }>> {
  const loaded = await loadOwnedSession(studioId, sessionId);
  if (!loaded.ok) return loaded;
  const { session } = loaded;
  if (session.custom_date === null) {
    return { ok: true, data: { clientId: session.client_id } };
  }
  await journeysRepository.clearCustomDate(sessionId);
  if (
    session.status === "todo" &&
    session.custom_date !== session.calculated_date
  ) {
    notifySessionsChanged([sessionId]);
  }
  return { ok: true, data: { clientId: session.client_id } };
}

/** Link Meet di un check (A17); null lo toglie. */
export async function setSessionMeetingUrl(
  studioId: string,
  input: { sessionId: string; meetingUrl: string | null },
): Promise<Result<{ clientId: string }>> {
  const loaded = await loadOwnedSession(studioId, input.sessionId);
  if (!loaded.ok) return loaded;
  await journeysRepository.setSessionMeetingUrl(
    input.sessionId,
    input.meetingUrl,
  );
  return { ok: true, data: { clientId: loaded.session.client_id } };
}

// ---------------------------------------------------------------------
// Cliente (C5, C19, C20)
// ---------------------------------------------------------------------

export type ClientSessionView = {
  id: string;
  position: number;
  type: "onboarding" | "check";
  name: SessionName;
  date: string;
  time: string | null;
  status: JourneySessionStatus;
  state: SessionState;
  /**
   * Link della videochiamata, solo sul prossimo check (C19): le altre
   * sessioni non lo mostrano. Mai l'origine né l'id dell'evento Google.
   */
  meetingUrl: string | null;
  /** Check con le foto: stato del set per il segno "Foto" (C19); aggiunto dalla pagina. */
  photo?: PhotoSetState;
};

export type ClientJourneyView = {
  id: string;
  number: number;
  durationMonths: JourneyDuration;
  startDate: string;
  endDate: string;
  status: JourneyStatus;
  month: { current: number; total: number };
  sessions: ClientSessionView[];
  completed: number;
  next: ClientSessionView | null;
};

export type ClientJourneys = {
  /** Percorso mostrato: quello richiesto, altrimenti l'attivo o l'ultimo. */
  shown: ClientJourneyView | null;
  /** Vero se il percorso mostrato è quello corrente (attivo o ultimo). */
  isCurrent: boolean;
  /** Percorsi conclusi diversi da quello mostrato, dal più recente. */
  previous: ClientJourneyView[];
  today: string;
};

async function loadOwnJourneys(): Promise<{
  views: ClientJourneyView[];
  today: string;
}> {
  const [journeys, sessions] = await Promise.all([
    journeysRepository.listOwnJourneys(),
    journeysRepository.listOwnSessions(),
  ]);
  const today = todayInRome();
  const views = journeys.map((journey): ClientJourneyView => {
    const dated = mergeCustomDates(
      sessions
        .filter((session) => session.journey_id === journey.id)
        .map((session) => ({
          id: session.id,
          position: session.seq,
          type: session.type as "onboarding" | "check",
          calculatedDate: session.session_date,
          customDate: null,
          time: shortTime(session.session_time),
          status: session.status as JourneySessionStatus,
          meetingUrl: session.meeting_url,
        })),
    );
    const names = sessionNames(dated, "client");
    const nextId =
      journey.status === "active" ? firstOpenId(dated, today) : null;
    const views = dated.map((session) => ({
      id: session.id,
      position: session.position,
      type: session.type,
      name: names.get(session.id)!,
      date: session.date,
      time: session.time,
      status: session.status,
      state: deriveSessionState(session, today, nextId),
      meetingUrl: session.id === nextId ? session.meetingUrl : null,
    }));
    const durationMonths = journey.duration_months as JourneyDuration;
    return {
      id: journey.id,
      number: journey.number,
      durationMonths,
      startDate: journey.start_date,
      endDate: journey.end_date,
      status: journey.status as JourneyStatus,
      month: journeyMonth(journey.start_date, durationMonths, today),
      sessions: views,
      completed: completedCount(views),
      next: views.find((session) => session.id === nextId) ?? null,
    };
  });
  return { views, today };
}

/** Pagina Percorso (C19, C20); `journeyId` dai percorsi precedenti. */
export async function getClientJourneys(
  journeyId?: string,
): Promise<ClientJourneys> {
  const { views, today } = await loadOwnJourneys();
  const current =
    views.find((view) => view.status === "active") ?? views.at(-1) ?? null;
  const shown =
    (journeyId && views.find((view) => view.id === journeyId)) || current;
  return {
    shown,
    isCurrent: shown?.id === current?.id,
    previous: views
      .filter((view) => view.status === "concluded" && view.id !== shown?.id)
      .reverse(),
    today,
  };
}

/** Riga "Il tuo percorso" della home (C5): solo con un percorso attivo. */
export async function getClientJourneyHome(): Promise<ClientJourneyView | null> {
  const { views } = await loadOwnJourneys();
  return views.find((view) => view.status === "active") ?? null;
}

/** Sessione propria per il file .ics; null se non è del cliente. */
export async function getOwnSession(
  sessionId: string,
): Promise<ClientSessionView | null> {
  const { views } = await loadOwnJourneys();
  for (const view of views) {
    const session = view.sessions.find((item) => item.id === sessionId);
    if (session) return session;
  }
  return null;
}
