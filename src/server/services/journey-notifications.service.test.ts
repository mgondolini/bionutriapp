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
  log.clear();
  outcomes.length = 0;
  scheduled.length = 0;
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
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
