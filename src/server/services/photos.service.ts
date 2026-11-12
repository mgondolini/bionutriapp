import "server-only";

import { randomUUID } from "node:crypto";
import { cache } from "react";

import {
  PHOTO_HEAD_BYTES,
  PHOTO_MAX_UPLOAD_BYTES,
  PHOTO_VIEWS,
  type JourneySessionStatus,
  type JourneySessionType,
  type PhotoRole,
  type PhotoSetStatus,
  type PhotoView,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { sessionNames, type SessionName } from "@/lib/domain/journeys/sessions";
import { todayInRome } from "@/lib/domain/tracking/dates";
import { photoSessionsOfJourney } from "@/lib/photos/checks";
import { hasJpegSignature, jpegHasMetadata } from "@/lib/photos/image";
import {
  getPhotoSetStatus,
  isOpenState,
  missingViews,
  type PhotoSetState,
} from "@/lib/photos/status";
import * as clientsRepository from "@/server/repositories/clients.repository";
import * as journeysRepository from "@/server/repositories/journeys.repository";
import * as photosRepository from "@/server/repositories/photos.repository";

/*
 * Foto di avanzamento (FOTO-01…FOTO-10). Il set è legato alla sessione del
 * percorso: numero e data del check vengono da lì. Un set si apre il giorno
 * del check (il database lo garantisce) e nasce al primo caricamento.
 * Caricamento in tre passaggi come i file: prepara → il browser carica →
 * conferma, con la verifica dell'oggetto reale (JPEG senza metadati).
 * Dopo il salvataggio non c'è nessuna operazione di modifica: lo rifiutano
 * anche i trigger.
 */

export type PhotoActor =
  | { kind: "staff"; studioId: string }
  | { kind: "client"; clientId: string; canWrite: boolean };

export type PhotoFailure =
  | "not_found"
  | "not_open"
  | "saved"
  | "read_only"
  | "incomplete"
  | "upload_failed"
  | "rejected";

type Failure = { ok: false; reason: PhotoFailure };

/** Check con le foto, comune alle due aree. */
type PhotoCheck = {
  sessionId: string;
  journeyActive: boolean;
  journeyOrder: string;
  checkNumber: number;
  /** Nome della sessione per chi guarda (lo staff vede la propria numerazione). */
  label: string;
  /** 1 = primo set di foto del percorso. */
  ordinal: number;
  date: string;
  sessionStatus: JourneySessionStatus;
};

export type PhotoItem = {
  view: PhotoView;
  url: string | null;
  uploadedAt: string;
  uploadedByRole: PhotoRole;
};

export type PhotoSetView = {
  sessionId: string;
  checkNumber: number;
  label: string;
  ordinal: number;
  date: string;
  state: Exclude<PhotoSetState, "skipped">;
  /** Nell'ordine Fronte, Lato, Dietro; solo le viste caricate. */
  photos: PhotoItem[];
  missing: PhotoView[];
  savedAt: string | null;
  savedByRole: PhotoRole | null;
  /** Comandi di caricamento, sostituzione, eliminazione e salvataggio. */
  canEdit: boolean;
};

function labelOf(name: SessionName | undefined, checkNumber: number): string {
  if (name?.kind === "check") return copy.photos.checkName(name.number);
  if (name?.kind === "gift") return copy.journeys.sessionName.gift;
  return copy.photos.checkName(checkNumber);
}

type SessionLike = {
  id: string;
  position: number;
  type: JourneySessionType;
  date: string;
  status: JourneySessionStatus;
};

function checksOfJourney(
  sessions: SessionLike[],
  durationMonths: number,
  audience: "staff" | "client",
  journey: { active: boolean; order: string },
): PhotoCheck[] {
  const names = sessionNames(sessions, audience);
  return photoSessionsOfJourney(sessions, durationMonths).map(
    ({ session, checkNumber }, index) => ({
      sessionId: session.id,
      journeyActive: journey.active,
      journeyOrder: journey.order,
      checkNumber,
      label: labelOf(names.get(session.id), checkNumber),
      ordinal: index + 1,
      date: session.date,
      sessionStatus: session.status,
    }),
  );
}

async function staffChecks(clientId: string): Promise<PhotoCheck[]> {
  const rows = await photosRepository.listStaffSessions(clientId);
  const byJourney = new Map<string, typeof rows>();
  for (const row of rows) {
    byJourney.set(row.journey_id, [
      ...(byJourney.get(row.journey_id) ?? []),
      row,
    ]);
  }
  return [...byJourney.values()].flatMap((sessions) => {
    const journey = sessions[0]!.client_journeys;
    return checksOfJourney(
      sessions.map((s) => ({
        id: s.id,
        position: s.position,
        type: s.type as JourneySessionType,
        date: s.custom_date ?? s.calculated_date,
        status: s.status as JourneySessionStatus,
      })),
      journey.duration_months,
      "staff",
      { active: journey.status === "active", order: journey.created_at },
    );
  });
}

async function clientChecks(): Promise<PhotoCheck[]> {
  const [journeys, sessions] = await Promise.all([
    journeysRepository.listOwnJourneys(),
    journeysRepository.listOwnSessions(),
  ]);
  return journeys.flatMap((journey) =>
    checksOfJourney(
      sessions
        .filter((s) => s.journey_id === journey.id)
        .map((s) => ({
          id: s.id,
          position: s.seq,
          type: s.type as JourneySessionType,
          date: s.session_date,
          status: s.status as JourneySessionStatus,
        })),
      journey.duration_months,
      "client",
      {
        active: journey.status === "active",
        order: String(journey.number).padStart(4, "0"),
      },
    ),
  );
}

type SetRow = photosRepository.SetRow;

function viewsOf(set: SetRow | undefined): PhotoView[] {
  return (set?.photos ?? []).map((p) => p.view as PhotoView);
}

function stateOf(check: PhotoCheck, set: SetRow | undefined, today: string) {
  return getPhotoSetStatus({
    sessionDate: check.date,
    today,
    sessionStatus: check.sessionStatus,
    setStatus: (set?.status as PhotoSetStatus | undefined) ?? null,
    views: viewsOf(set),
  });
}

/**
 * Set da mostrare: prima quelli aperti (dal più recente), poi i salvati
 * (dal più recente), in fondo i prossimi (dal più vicino). Un check saltato
 * senza foto non compare; di un percorso concluso restano solo i set con
 * foto.
 */
function buildViews(
  checks: PhotoCheck[],
  sets: SetRow[],
  urls: Map<string, string>,
  canWrite: boolean,
): PhotoSetView[] {
  const today = todayInRome();
  const setBySession = new Map(sets.map((set) => [set.session_id, set]));
  const views: PhotoSetView[] = [];
  for (const check of checks) {
    const set = setBySession.get(check.sessionId);
    const state = stateOf(check, set, today);
    if (state === "skipped") continue;
    if (!check.journeyActive && (state === "future" || state === "to_upload")) {
      continue;
    }
    const photos = PHOTO_VIEWS.flatMap((view): PhotoItem[] => {
      const photo = set?.photos.find((p) => p.view === view);
      return photo
        ? [
            {
              view,
              url: urls.get(photo.storage_path) ?? null,
              uploadedAt: photo.uploaded_at,
              uploadedByRole: photo.uploaded_by_role as PhotoRole,
            },
          ]
        : [];
    });
    views.push({
      sessionId: check.sessionId,
      checkNumber: check.checkNumber,
      label: check.label,
      ordinal: check.ordinal,
      date: check.date,
      state,
      photos,
      missing: missingViews(photos.map((p) => p.view)),
      savedAt: set?.saved_at ?? null,
      savedByRole: (set?.saved_by_role as PhotoRole | null) ?? null,
      canEdit: canWrite && isOpenState(state),
    });
  }
  const group = (v: PhotoSetView) =>
    isOpenState(v.state) ? 0 : v.state === "saved" ? 1 : 2;
  return views.sort((a, b) => {
    if (group(a) !== group(b)) return group(a) - group(b);
    const byDate = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    return group(a) === 2 ? byDate : -byDate;
  });
}

async function signedUrls(sets: SetRow[]) {
  return photosRepository.createSignedUrls(
    sets.flatMap((set) => set.photos.map((photo) => photo.storage_path)),
  );
}

// ---------------------------------------------------------------------
// Letture
// ---------------------------------------------------------------------

export type StaffPhotos = {
  clientId: string;
  firstName: string;
  fullName: string;
  pushEnabled: boolean;
  sets: PhotoSetView[];
  savedCount: number;
  /** Date (ISO) dei promemoria delle foto inviati, per sessione. */
  reminders: Record<string, string[]>;
};

/** Scheda Foto (A20); null se il cliente non è dello studio. */
export async function getStaffPhotos(
  studioId: string,
  clientId: string,
): Promise<StaffPhotos | null> {
  const client = await clientsRepository.getClientProfile(clientId);
  if (!client || client.studio_id !== studioId) return null;
  const [checks, sets, reminderRows] = await Promise.all([
    staffChecks(clientId),
    photosRepository.listSetsOfClient(clientId),
    photosRepository.listPhotoReminders(clientId),
  ]);
  const views = buildViews(checks, sets, await signedUrls(sets), true);
  const reminders: Record<string, string[]> = {};
  for (const row of reminderRows) {
    if (row.outcome !== "sent" && row.outcome !== "partial") continue;
    (reminders[row.session_id] ??= []).push(row.created_at);
  }
  return {
    clientId,
    firstName: client.first_name ?? "",
    fullName: [client.first_name, client.last_name].filter(Boolean).join(" "),
    pushEnabled: client.push_enabled ?? false,
    sets: views,
    savedCount: views.filter((v) => v.state === "saved").length,
    reminders,
  };
}

/** Badge della scheda Foto: set aperti da completare. */
export const getStaffOpenPhotoSets = cache(
  async (clientId: string): Promise<number> => {
    const [checks, sets] = await Promise.all([
      staffChecks(clientId),
      photosRepository.listSetsOfClient(clientId),
    ]);
    return buildViews(checks, sets, new Map(), true).filter((v) =>
      isOpenState(v.state),
    ).length;
  },
);

/** Sessioni con le foto e stato del segno nella scheda Percorso (A17). */
export async function getStaffPhotoMarks(
  clientId: string,
): Promise<Record<string, PhotoSetState>> {
  const [checks, sets] = await Promise.all([
    staffChecks(clientId),
    photosRepository.listSetsOfClient(clientId),
  ]);
  const today = todayInRome();
  const bySession = new Map(sets.map((s) => [s.session_id, s]));
  return Object.fromEntries(
    checks.map((c) => [
      c.sessionId,
      stateOf(c, bySession.get(c.sessionId), today),
    ]),
  );
}

/** Set del cliente della sessione, senza URL (menu, home, percorso). */
const loadClientOverview = cache(async (clientId: string) => {
  const [checks, sets] = await Promise.all([
    clientChecks(),
    photosRepository.listSetsOfClient(clientId),
  ]);
  return { checks, sets };
});

export type ClientPhotos = { sets: PhotoSetView[]; canWrite: boolean };

/** Pagina Foto (C22) e pagina del set (C23–C26). */
export async function getClientPhotos(
  clientId: string,
  canWrite: boolean,
): Promise<ClientPhotos> {
  const { checks, sets } = await loadClientOverview(clientId);
  return {
    sets: buildViews(checks, sets, await signedUrls(sets), canWrite),
    canWrite,
  };
}

/** Set aperti (badge del menu e card della home), dal più recente. */
export async function getClientOpenPhotoSets(
  clientId: string,
): Promise<PhotoSetView[]> {
  const { checks, sets } = await loadClientOverview(clientId);
  return buildViews(checks, sets, new Map(), false).filter((v) =>
    isOpenState(v.state),
  );
}

/** Sessioni con le foto e stato del segno nella pagina Percorso (C19). */
export async function getClientPhotoMarks(
  clientId: string,
): Promise<Record<string, PhotoSetState>> {
  const { checks, sets } = await loadClientOverview(clientId);
  const today = todayInRome();
  const bySession = new Map(sets.map((s) => [s.session_id, s]));
  return Object.fromEntries(
    checks.map((c) => [
      c.sessionId,
      stateOf(c, bySession.get(c.sessionId), today),
    ]),
  );
}

// ---------------------------------------------------------------------
// Scritture
// ---------------------------------------------------------------------

type Resolved = { ok: true; clientId: string; check: PhotoCheck };

/** La sessione è un check con le foto visibile a chi agisce, e si può scrivere. */
async function resolveWritable(
  actor: PhotoActor,
  sessionId: string,
): Promise<Resolved | Failure> {
  let clientId: string;
  let checks: PhotoCheck[];
  if (actor.kind === "staff") {
    const row = await photosRepository.getStaffSession(sessionId);
    if (!row || row.studio_id !== actor.studioId) {
      return { ok: false, reason: "not_found" };
    }
    clientId = row.client_id;
    const journey = row.client_journeys;
    checks = checksOfJourney(
      journey.journey_sessions.map((s) => ({
        id: s.id,
        position: s.position,
        type: s.type as JourneySessionType,
        // solo la sessione richiesta serve con la data giusta
        date: s.id === row.id ? (row.custom_date ?? row.calculated_date) : "",
        status: s.id === row.id ? (row.status as JourneySessionStatus) : "todo",
      })),
      journey.duration_months,
      "staff",
      { active: journey.status === "active", order: "" },
    );
  } else {
    if (!actor.canWrite) return { ok: false, reason: "read_only" };
    clientId = actor.clientId;
    checks = await clientChecks();
  }
  const check = checks.find((c) => c.sessionId === sessionId);
  if (!check) return { ok: false, reason: "not_found" };
  if (check.date > todayInRome()) return { ok: false, reason: "not_open" };
  return { ok: true, clientId, check };
}

async function draftSet(
  sessionId: string,
): Promise<{ ok: true; set: SetRow } | Failure> {
  const set = await photosRepository.getSetBySession(sessionId);
  if (!set) return { ok: false, reason: "not_found" };
  if (set.status === "saved") return { ok: false, reason: "saved" };
  return { ok: true, set };
}

/** {studio}/{cliente}/{set}/{vista}-{uuid}.jpg: costruito solo qui. */
function objectPath(set: SetRow, view: PhotoView, objectId: string) {
  return `${set.studio_id}/${set.client_id}/${set.id}/${view}-${objectId}.jpg`;
}

async function discard(paths: string[], context: string) {
  const error = await photosRepository.removeObjects(paths);
  if (error) {
    // l'oggetto resta senza riga: lo elimina il cron di manutenzione
    console.error(`[foto] ${context}: oggetto non eliminato`, {
      error: error.message,
    });
  }
}

export type PreparePhotoResult =
  { ok: true; objectId: string; uploadUrl: string } | Failure;

/** Primo passaggio: apre il set se serve e firma l'URL di caricamento. */
export async function preparePhotoUpload(
  actor: PhotoActor,
  input: { sessionId: string; view: PhotoView },
): Promise<PreparePhotoResult> {
  const resolved = await resolveWritable(actor, input.sessionId);
  if (!resolved.ok) return resolved;
  const opened = await photosRepository.ensureSet(input.sessionId);
  if (!opened.ok) {
    return {
      ok: false,
      reason: opened.reason === "not_open" ? "not_open" : "read_only",
    };
  }
  const draft = await draftSet(input.sessionId);
  if (!draft.ok) return draft;
  const objectId = randomUUID();
  const uploadUrl = await photosRepository.createSignedUploadUrl(
    objectPath(draft.set, input.view, objectId),
  );
  return { ok: true, objectId, uploadUrl };
}

export type PhotoWriteResult = { ok: true; clientId: string } | Failure;

/**
 * Terzo passaggio: verifica l'oggetto reale (esiste, entro il limite, è un
 * JPEG senza metadati) e solo allora crea o sostituisce la riga. Se la
 * verifica fallisce l'oggetto viene eliminato; dopo una sostituzione si
 * elimina l'oggetto precedente.
 */
export async function confirmPhotoUpload(
  actor: PhotoActor,
  input: { sessionId: string; view: PhotoView; objectId: string },
): Promise<PhotoWriteResult> {
  const resolved = await resolveWritable(actor, input.sessionId);
  if (!resolved.ok) return resolved;
  const draft = await draftSet(input.sessionId);
  if (!draft.ok) return draft;
  const path = objectPath(draft.set, input.view, input.objectId);

  const info = await photosRepository.getObjectInfo(path);
  if (!info) return { ok: false, reason: "upload_failed" };
  let valid = info.size > 0 && info.size <= PHOTO_MAX_UPLOAD_BYTES;
  if (valid) {
    const head = await photosRepository.readObjectHead(path, PHOTO_HEAD_BYTES);
    valid = !!head && hasJpegSignature(head) && !jpegHasMetadata(head);
  }
  if (!valid) {
    await discard([path], "foto rifiutata");
    return { ok: false, reason: "rejected" };
  }

  const row = {
    setId: draft.set.id,
    view: input.view,
    storagePath: path,
    sizeBytes: info.size,
  };
  const exists = draft.set.photos.some((p) => p.view === input.view);
  let previousPath: string | null = null;
  let outcome: "ok" | "saved" | "denied";
  if (!exists) {
    const inserted = await photosRepository.insertPhoto(row);
    if (inserted === "duplicate") {
      // caricata nel frattempo da un altro dispositivo: diventa una sostituzione
      const replaced = await photosRepository.replacePhoto(row);
      outcome = replaced.ok ? "ok" : replaced.reason;
      if (replaced.ok) previousPath = replaced.previousPath;
    } else {
      outcome = inserted;
    }
  } else {
    const replaced = await photosRepository.replacePhoto(row);
    outcome = replaced.ok ? "ok" : replaced.reason;
    if (replaced.ok) previousPath = replaced.previousPath;
  }
  if (outcome !== "ok") {
    await discard([path], "foto non registrata");
    return { ok: false, reason: outcome === "saved" ? "saved" : "read_only" };
  }
  if (previousPath && previousPath !== path) {
    await discard([previousPath], "foto sostituita");
  }
  return { ok: true, clientId: resolved.clientId };
}

/** Elimina una foto di un set in bozza: prima la riga, poi l'oggetto. */
export async function deletePhoto(
  actor: PhotoActor,
  input: { sessionId: string; view: PhotoView },
): Promise<PhotoWriteResult> {
  const resolved = await resolveWritable(actor, input.sessionId);
  if (!resolved.ok) return resolved;
  const draft = await draftSet(input.sessionId);
  if (!draft.ok) return draft;
  const deleted = await photosRepository.deletePhoto(draft.set.id, input.view);
  if (!deleted.ok) {
    return {
      ok: false,
      reason: deleted.reason === "saved" ? "saved" : "read_only",
    };
  }
  if (deleted.path) await discard([deleted.path], "foto eliminata");
  return { ok: true, clientId: resolved.clientId };
}

/** "Salva le foto": definitivo, solo con tutte e tre le viste. */
export async function savePhotoSet(
  actor: PhotoActor,
  input: { sessionId: string },
): Promise<PhotoWriteResult> {
  const resolved = await resolveWritable(actor, input.sessionId);
  if (!resolved.ok) return resolved;
  const draft = await draftSet(input.sessionId);
  if (!draft.ok) return draft;
  if (missingViews(viewsOf(draft.set)).length > 0) {
    return { ok: false, reason: "incomplete" };
  }
  const saved = await photosRepository.saveSet(draft.set.id);
  if (saved === "incomplete") return { ok: false, reason: "incomplete" };
  if (saved === "not_draft") return { ok: false, reason: "saved" };
  return { ok: true, clientId: resolved.clientId };
}
