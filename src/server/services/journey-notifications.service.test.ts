import { beforeEach, describe, expect, it, vi } from "vitest";

import type { JourneyNotificationRow } from "@/server/repositories/journeys.repository";

/*
 * Push del percorso con repository e invio simulati: il registro in memoria
 * ha il vincolo unico (sessione, tipo, data, ora) come il database.
 */

const log = new Map<string, JourneyNotificationRow & { id: string }>();
const outcomes: { id: string; outcome: string }[] = [];
const keyOf = (row: JourneyNotificationRow) =>
  [row.sessionId, row.kind, row.referenceDate, row.referenceTime].join("|");

vi.mock("@/server/repositories/photos.repository", () => ({
  listReminderCandidates: vi.fn(async () => []),
}));

vi.mock("@/server/repositories/onboarding-prep.repository", () => ({
  listReminderCandidates: vi.fn(async () => []),
}));

vi.mock("next/server", () => ({
  after: vi.fn((callback: () => Promise<void>) => scheduled.push(callback)),
}));
vi.mock("@/server/repositories/notifications.repository", () => ({
  listStudios: vi.fn(async () => [
    { id: "roma", name: "Studio Roma", timezone: "Europe/Rome" },
  ]),
}));
vi.mock("@/server/repositories/journeys.repository", () => ({
  listReminderCandidates: vi.fn(),
  getSessionNotificationTarget: vi.fn(),
  insertNotifications: vi.fn(async (rows: JourneyNotificationRow[]) =>
    rows.flatMap((row) => {
      if (log.has(keyOf(row))) return [];
      const id = `log-${log.size + 1}`;
      log.set(keyOf(row), { ...row, id });
      return [{ id, sessionId: row.sessionId }];
    }),
  ),
  completeNotification: vi.fn(async (id: string, outcome: string) => {
    outcomes.push({ id, outcome });
  }),
}));
vi.mock("@/server/services/push.service", () => ({
  sendToUser: vi.fn(async () => ({
    status: "sent",
    delivered: 1,
    failed: 0,
    removed: 0,
  })),
}));

const scheduled: (() => Promise<void>)[] = [];
const repo = await import("@/server/repositories/journeys.repository");
const photosRepo = await import("@/server/repositories/photos.repository");
const prepRepo =
  await import("@/server/repositories/onboarding-prep.repository");
const push = await import("@/server/services/push.service");
const service = await import("./journey-notifications.service");

type Candidate = Awaited<
  ReturnType<typeof repo.listReminderCandidates>
>[number];
const candidate = (over: Partial<Candidate> = {}): Candidate => ({
  session_id: "s6",
  client_id: "c1",
  user_id: "u1",
  type: "check",
  check_number: 6,
  session_date: "2026-11-05",
  session_time: "10:30:00",
  staff_name: "Dott. Fabio Carburi",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(photosRepo.listReminderCandidates).mockResolvedValue([]);
  vi.mocked(prepRepo.listReminderCandidates).mockResolvedValue([]);
  log.clear();
  outcomes.length = 0;
  scheduled.length = 0;
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("promemoria delle foto (C27)", () => {
  type PhotoCandidate = Awaited<
    ReturnType<typeof photosRepo.listReminderCandidates>
  >[number];
  const photo = (over: Partial<PhotoCandidate> = {}): PhotoCandidate => ({
    session_id: "s6",
    client_id: "c1",
    user_id: "u1",
    check_number: 6,
    session_date: "2026-11-05",
    session_time: "10:30:00",
    photo_count: 0,
    missing_views: ["front", "side", "back"],
    ...over,
  });

  it("il giorno del check la push delle foto sostituisce quella del mattino", async () => {
    vi.mocked(repo.listReminderCandidates).mockResolvedValue([candidate()]);
    vi.mocked(photosRepo.listReminderCandidates).mockResolvedValue([photo()]);
    const { jobs } = await service.prepareJourneyReminders(
      new Date("2026-11-05T07:00:00Z"),
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.payload).toMatchObject({
      title: "Oggi hai il Check 6: carica le foto",
      body: "Alle 10:30. Servono fronte, lato e dietro: ci vogliono due minuti.",
      url: "/app/foto",
    });
    expect([...log.values()][0]).toMatchObject({
      kind: "photos_daily",
      referenceDate: "2026-11-05",
    });
  });

  it("un promemoria ogni mattina: prima, dopo e per le foto di partenza", async () => {
    vi.mocked(repo.listReminderCandidates).mockResolvedValue([]);
    vi.mocked(photosRepo.listReminderCandidates).mockResolvedValue([
      photo({ session_id: "a", session_date: "2026-11-07" }),
      photo({
        session_id: "b",
        session_date: "2026-11-02",
        photo_count: 2,
        missing_views: ["back"],
      }),
      photo({
        session_id: "c",
        // onboarding: la RPC restituisce null (i tipi generati non lo prevedono)
        check_number: null as unknown as number,
        session_date: "2026-11-06",
      }),
    ]);
    const MORNING = new Date("2026-11-05T07:00:00Z");
    const { jobs } = await service.prepareJourneyReminders(MORNING);
    expect(jobs.map((job) => [job.payload.title, job.payload.body])).toEqual([
      [
        "Puoi già caricare le foto del Check 6",
        "Servono fronte, lato e dietro: ci vogliono due minuti.",
      ],
      [
        "Foto del Check 6 da completare",
        "Hai caricato 2 foto su 3. Manca Dietro: aggiungila e poi salva.",
      ],
      [
        "Puoi già caricare le foto di partenza",
        "Servono fronte, lato e dietro: ci vogliono due minuti.",
      ],
    ]);
    // stesso giorno, seconda esecuzione: nessun doppione
    const second = await service.prepareJourneyReminders(MORNING);
    expect(second.jobs).toEqual([]);
  });

  it("alle 18 nessun promemoria delle foto", async () => {
    vi.mocked(repo.listReminderCandidates).mockResolvedValue([]);
    vi.mocked(photosRepo.listReminderCandidates).mockResolvedValue([photo()]);
    const { jobs } = await service.prepareJourneyReminders(
      new Date("2026-11-05T17:00:00Z"),
    );
    expect(jobs).toEqual([]);
    expect(photosRepo.listReminderCandidates).not.toHaveBeenCalled();
  });
});

describe("promemoria del percorso", () => {
  // 17:00 UTC del 4 novembre = 18:00 a Roma (ora solare)
  const EVENING = new Date("2026-11-04T17:00:00Z");
  // 07:00 UTC del 5 novembre = 08:00 a Roma
  const MORNING = new Date("2026-11-05T07:00:00Z");

  it("la sera prima: sessioni di domani, testo del mockup", async () => {
    vi.mocked(repo.listReminderCandidates).mockResolvedValue([candidate()]);
    const { report, jobs } = await service.prepareJourneyReminders(EVENING);
    expect(repo.listReminderCandidates).toHaveBeenCalledWith(
      "roma",
      "2026-11-05",
    );
    expect(report).toEqual({ studios: 1, queued: 1, duplicates: 0 });
    expect(jobs[0]!.payload).toMatchObject({
      title: "Domani hai il Check 6",
      body: "Alle 10:30 con il Dott. Fabio Carburi.",
      url: "/app/percorso",
    });
  });

  it("la mattina stessa; nessun promemoria per una sessione prima delle 8", async () => {
    vi.mocked(repo.listReminderCandidates).mockResolvedValue([
      candidate(),
      candidate({ session_id: "s7", session_time: "07:30:00" }),
    ]);
    const { jobs } = await service.prepareJourneyReminders(MORNING);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.payload).toMatchObject({
      title: "Oggi hai il Check 6",
      body: "Alle 10:30. Puoi aggiungerlo al calendario dalla pagina del percorso.",
    });
  });

  it("nessun invio doppio: una seconda esecuzione nella stessa ora non invia", async () => {
    vi.mocked(repo.listReminderCandidates).mockResolvedValue([candidate()]);
    await service.sendJourneyReminders(EVENING);
    const second = await service.sendJourneyReminders(EVENING);
    expect(second).toEqual({ studios: 1, queued: 0, duplicates: 1 });
    expect(scheduled).toHaveLength(1);
    await scheduled[0]!();
    expect(push.sendToUser).toHaveBeenCalledTimes(1);
    expect(outcomes).toEqual([{ id: "log-1", outcome: "sent" }]);
  });

  it("fuori dalle 18 e dalle 8 non fa nulla", async () => {
    const report = await service.sendJourneyReminders(
      new Date("2026-11-04T12:00:00Z"),
    );
    expect(report.studios).toBe(0);
    expect(repo.listReminderCandidates).not.toHaveBeenCalled();
  });

  it("senza dispositivi l'esito è non consegnata, senza errori", async () => {
    vi.mocked(repo.listReminderCandidates).mockResolvedValue([candidate()]);
    vi.mocked(push.sendToUser).mockResolvedValueOnce({
      status: "skipped",
      reason: "no_devices",
    });
    await service.sendJourneyReminders(EVENING);
    await scheduled[0]!();
    expect(outcomes).toEqual([{ id: "log-1", outcome: "not_delivered" }]);
  });
});

describe("preparazione della chiamata (C32)", () => {
  // 17:00 UTC del 4 novembre = 18:00 a Roma
  const EVENING = new Date("2026-11-04T17:00:00Z");
  type Prep = Awaited<
    ReturnType<typeof prepRepo.listReminderCandidates>
  >[number];
  const prep = (over: Partial<Prep> = {}): Prep => ({
    session_id: "s0",
    client_id: "c9",
    user_id: "u9",
    call_date: "2026-11-05",
    call_time: "18:00:00",
    measures_missing: true,
    photos_missing: true,
    ...over,
  });

  it("alle 18 cerca le chiamate fra 1 e 2 giorni", async () => {
    await service.prepareJourneyReminders(EVENING);
    expect(prepRepo.listReminderCandidates).toHaveBeenCalledWith(
      "roma",
      "2026-11-05",
      "2026-11-06",
    );
  });

  it("il giorno prima: ultimo promemoria con cosa manca, al posto di quello serale", async () => {
    vi.mocked(prepRepo.listReminderCandidates).mockResolvedValue([prep()]);
    vi.mocked(repo.listReminderCandidates).mockResolvedValue([
      candidate({ session_id: "s0", type: "onboarding", check_number: 0 }),
    ]);
    const { jobs } = await service.prepareJourneyReminders(EVENING);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.payload).toMatchObject({
      title: "Ultimo promemoria",
      body: "Domani la chiamata: mancano misure e foto.",
      url: "/app/prepara",
    });
    expect([...log.values()][0]).toMatchObject({
      kind: "prep_1d",
      referenceDate: "2026-11-05",
    });
  });

  it("2 giorni prima: dice cosa manca e la scadenza", async () => {
    vi.mocked(prepRepo.listReminderCandidates).mockResolvedValue([
      prep({ call_date: "2026-11-06", measures_missing: false }),
    ]);
    const { jobs } = await service.prepareJourneyReminders(EVENING);
    expect(jobs[0]!.payload).toMatchObject({
      title: "Mancano ancora le tue foto",
      body: "Il dottore ti chiama venerdì: mandale entro giovedì sera.",
    });
  });

  it("alle 8 nessun promemoria della preparazione", async () => {
    await service.prepareJourneyReminders(new Date("2026-11-05T07:00:00Z"));
    expect(prepRepo.listReminderCandidates).not.toHaveBeenCalled();
  });
});

describe("cambio di data", () => {
  type Target = NonNullable<
    Awaited<ReturnType<typeof repo.getSessionNotificationTarget>>
  >;
  const target = (over: Partial<Target> = {}): Target =>
    ({
      id: "s6",
      journey_id: "j1",
      studio_id: "roma",
      client_id: "c1",
      calculated_date: "2099-11-03",
      custom_date: "2099-11-05",
      session_time: "10:30:00",
      status: "todo",
      clients: { user_id: "u1", account_status: "active" },
      studios: { name: "Studio Roma" },
      client_journeys: {
        status: "active",
        journey_sessions: [
          { id: "s0", position: 0, type: "gift" },
          { id: "s6", position: 6, type: "check" },
        ],
      },
      ...over,
    }) as Target;

  it("avvisa subito con la numerazione del cliente (l'omaggio conta come check)", async () => {
    vi.mocked(repo.getSessionNotificationTarget).mockResolvedValue(target());
    service.notifySessionsChanged(["s6"]);
    await scheduled[0]!();
    expect(push.sendToUser).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        title: "Data del check cambiata",
        body: "Il Check 2 si sposta al 5 novembre 2099, alle 10:30.",
        tag: "journey-s6",
      }),
      12 * 60 * 60,
    );
  });

  it("lo stesso cambio salvato due volte manda una sola push", async () => {
    vi.mocked(repo.getSessionNotificationTarget).mockResolvedValue(target());
    await service.deliverDateChanges(["s6"]);
    await service.deliverDateChanges(["s6"]);
    expect(push.sendToUser).toHaveBeenCalledTimes(1);
  });

  it("niente avviso per sessioni completate o già passate", async () => {
    vi.mocked(repo.getSessionNotificationTarget)
      .mockResolvedValueOnce(target({ status: "done" }))
      .mockResolvedValueOnce(
        target({ custom_date: "2000-01-01", calculated_date: "2000-01-01" }),
      );
    await service.deliverDateChanges(["s6", "s6"]);
    expect(push.sendToUser).not.toHaveBeenCalled();
  });

  it("cliente senza account: registrata come non consegnata", async () => {
    vi.mocked(repo.getSessionNotificationTarget).mockResolvedValue(
      target({ clients: { user_id: null, account_status: "to_invite" } }),
    );
    await service.deliverDateChanges(["s6"]);
    expect(push.sendToUser).not.toHaveBeenCalled();
    expect(outcomes).toEqual([{ id: "log-1", outcome: "not_delivered" }]);
  });
});
