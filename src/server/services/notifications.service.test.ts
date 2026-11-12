import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  FileRecipient,
  NewLogEntry,
  ReminderCandidate,
} from "@/server/repositories/notifications.repository";

/*
 * NotificationService (N-06) con repository e invio simulati: il registro in
 * memoria ha la dedupe_key unica come il database. Un file avvisa solo chi è
 * attivo, In percorso e con gli avvisi accesi; l'invio parte dopo la risposta
 * e non lancia mai; il promemoria parte solo per gli studi alle 20 nel
 * proprio fuso, una volta sola al giorno.
 */

const log = new Map<string, NewLogEntry & { id: string }>();
const completed: { id: string; status: string }[] = [];

vi.mock("next/server", () => ({
  after: vi.fn((callback: () => Promise<void>) => scheduled.push(callback)),
}));
vi.mock("@/server/repositories/notifications.repository", () => ({
  getFileRecipient: vi.fn(),
  listStudios: vi.fn(),
  listDailyReminderCandidates: vi.fn(),
  listMeasureCheckCandidates: vi.fn(),
  insertLogEntries: vi.fn(async (entries: NewLogEntry[]) =>
    entries.flatMap((entry) => {
      if (log.has(entry.dedupeKey)) return [];
      const id = `log-${log.size + 1}`;
      log.set(entry.dedupeKey, { ...entry, id });
      return [{ id, dedupeKey: entry.dedupeKey }];
    }),
  ),
  completeLogEntry: vi.fn(async (id: string, outcome: { status: string }) => {
    completed.push({ id, status: outcome.status });
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
const repo = await import("@/server/repositories/notifications.repository");
const push = await import("@/server/services/push.service");
const service = await import("./notifications.service");

const recipient = (over: Partial<FileRecipient> = {}): FileRecipient => ({
  fileId: "f1",
  category: "workout",
  clientId: "c1",
  studioId: "s1",
  studioName: "Studio Verde",
  userId: "u1",
  accountStatus: "active",
  journeyStage: "in_progress",
  filesEnabled: true,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  log.clear();
  completed.length = 0;
  scheduled.length = 0;
  vi.mocked(repo.getFileRecipient).mockResolvedValue(recipient());
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("notifyNewFile", () => {
  it("programma l'invio dopo la risposta e apre la categoria del file", async () => {
    service.notifyNewFile("f1");
    expect(push.sendToUser).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(1);

    await scheduled[0]();
    expect(push.sendToUser).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        type: "file_workout",
        title: "Studio Verde",
        url: "/app/allenamenti",
        tag: "files:file_workout",
      }),
      24 * 60 * 60,
    );
    expect([...log.values()][0]).toMatchObject({
      dedupeKey: "file:f1",
      status: "queued",
      payload: { url: "/app/allenamenti", fileId: "f1" },
    });
    expect(completed).toEqual([{ id: "log-1", status: "sent" }]);
  });

  it("una conferma ripetuta non invia una seconda notifica", async () => {
    await service.deliverNewFile("f1");
    expect(push.sendToUser).toHaveBeenCalledTimes(1);
  });

  it.each([
    [
      "account non attivo",
      { accountStatus: "invited", userId: null },
      "inactive",
    ],
    ["in Onboarding", { journeyStage: "onboarding" as const }, "journey_stage"],
    ["in pausa", { journeyStage: "paused" as const }, "journey_stage"],
    ["concluso", { journeyStage: "completed" as const }, "journey_stage"],
    ["avvisi dei file spenti", { filesEnabled: false }, "disabled_by_user"],
  ])(
    "%s: nessun invio, record saltato con il motivo",
    async (_, over, reason) => {
      vi.mocked(repo.getFileRecipient).mockResolvedValueOnce(recipient(over));
      await service.deliverNewFile("f1");
      expect(push.sendToUser).not.toHaveBeenCalled();
      expect([...log.values()][0]).toMatchObject({
        status: "skipped",
        skippedReason: reason,
      });
    },
  );

  it("senza dispositivi il record diventa saltato", async () => {
    vi.mocked(push.sendToUser).mockResolvedValueOnce({
      status: "skipped",
      reason: "no_devices",
    });
    await service.deliverNewFile("f1");
    expect(completed).toEqual([{ id: "log-1", status: "skipped" }]);
  });

  it("un errore dell'invio resta nei log e non lancia", async () => {
    vi.mocked(push.sendToUser).mockRejectedValueOnce(new Error("boom"));
    await expect(service.deliverNewFile("f1")).resolves.toBeUndefined();
    vi.mocked(repo.getFileRecipient).mockRejectedValueOnce(new Error("db"));
    await expect(service.deliverNewFile("f2")).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});

describe("promemoria serale", () => {
  // 18:00 UTC del 6 luglio: 20:00 a Roma (ora legale), 14:00 a New York
  const NOW = new Date("2026-07-06T18:00:00Z");
  const candidates: ReminderCandidate[] = [
    { clientId: "c1", userId: "u1", habitsDone: false, workoutDone: false },
    { clientId: "c2", userId: "u2", habitsDone: false, workoutDone: true },
    { clientId: "c3", userId: "u3", habitsDone: true, workoutDone: false },
  ];

  beforeEach(() => {
    vi.mocked(repo.listStudios).mockResolvedValue([
      { id: "roma", name: "Studio Roma", timezone: "Europe/Rome" },
      { id: "ny", name: "Studio NY", timezone: "America/New_York" },
      { id: "rotto", name: "Studio X", timezone: "Europa/Roma" },
    ]);
    vi.mocked(repo.listDailyReminderCandidates).mockResolvedValue(candidates);
  });

  it("solo gli studi alle 20 nel proprio fuso, con il giorno locale", async () => {
    const { report } = await service.prepareDailyReminders(NOW);
    expect(repo.listDailyReminderCandidates).toHaveBeenCalledTimes(1);
    expect(repo.listDailyReminderCandidates).toHaveBeenCalledWith(
      "roma",
      "2026-07-06",
    );
    expect(report).toEqual({
      studios: 1,
      queued: 2,
      skipped: 1,
      duplicates: 0,
    });
  });

  it("variante per cliente; chi ha già compilato è saltato", async () => {
    const { jobs } = await service.prepareDailyReminders(NOW);
    expect(jobs.map((job) => [job.clientId, job.event])).toEqual([
      ["c1", { type: "daily_checkin", day: "2026-07-06", variant: "workout" }],
      ["c2", { type: "daily_checkin", day: "2026-07-06", variant: "base" }],
    ]);
    expect(log.get("checkin:c3:2026-07-06")).toMatchObject({
      status: "skipped",
      skippedReason: "already_completed",
    });
  });

  it("due esecuzioni nella stessa ora: la seconda non invia nulla", async () => {
    await service.sendDailyReminders(NOW);
    const second = await service.sendDailyReminders(NOW);
    expect(second).toEqual({
      studios: 1,
      queued: 0,
      skipped: 0,
      duplicates: 3,
    });
    expect(scheduled).toHaveLength(1);
    await scheduled[0]();
    expect(push.sendToUser).toHaveBeenCalledTimes(2);
    expect(push.sendToUser).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        tag: "checkin-2026-07-06",
        url: "/app/tracking",
      }),
      2 * 60 * 60,
    );
  });

  it("fuori dalle 20 non fa nulla", async () => {
    const report = await service.sendDailyReminders(
      new Date("2026-07-06T17:00:00Z"),
    );
    expect(report.studios).toBe(0);
    expect(repo.listDailyReminderCandidates).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(0);
  });
});

describe("promemoria del check delle misure", () => {
  // 05:00 UTC del 30 novembre: 6:00 a Roma (ora solare)
  const NOW = new Date("2026-11-30T05:00:00Z");
  const base = {
    override: null,
    overrideSetAt: null,
    lastCreatedAt: "2026-10-01T08:00:00Z",
  };

  beforeEach(() => {
    vi.mocked(repo.listStudios).mockResolvedValue([
      { id: "roma", name: "Studio Roma", timezone: "Europe/Rome" },
      { id: "ny", name: "Studio NY", timezone: "America/New_York" },
    ]);
    vi.mocked(repo.listMeasureCheckCandidates).mockResolvedValue([
      // check domani (31 ottobre + 30)
      { ...base, clientId: "c1", userId: "u1", lastRecordedOn: "2026-11-01" },
      // check oggi
      { ...base, clientId: "c2", userId: "u2", lastRecordedOn: "2026-10-31" },
      // check fra tre giorni: niente
      { ...base, clientId: "c3", userId: "u3", lastRecordedOn: "2026-11-03" },
      // data scelta dallo staff: oggi
      {
        clientId: "c4",
        userId: "u4",
        override: "2026-11-30",
        overrideSetAt: "2026-11-20T10:00:00Z",
        lastRecordedOn: "2026-11-15",
        lastCreatedAt: "2026-11-15T08:00:00Z",
      },
      // mai registrato e nessuna data: niente
      {
        ...base,
        clientId: "c5",
        userId: "u5",
        lastRecordedOn: null,
        lastCreatedAt: null,
      },
    ]);
  });

  it("alle 6 nel fuso dello studio: giorno prima e giorno stesso", async () => {
    const { report, jobs } = await service.prepareMeasureCheckReminders(NOW);
    expect(repo.listMeasureCheckCandidates).toHaveBeenCalledWith("roma");
    expect(report).toEqual({ studios: 1, queued: 3, duplicates: 0 });
    expect(jobs.map((job) => [job.clientId, job.event])).toEqual([
      ["c1", { type: "measure_check", dueOn: "2026-12-01", when: "eve" }],
      ["c2", { type: "measure_check", dueOn: "2026-11-30", when: "day" }],
      ["c4", { type: "measure_check", dueOn: "2026-11-30", when: "day" }],
    ]);
  });

  it("una seconda esecuzione non invia di nuovo; il testo non ha misure", async () => {
    await service.sendMeasureCheckReminders(NOW);
    const second = await service.sendMeasureCheckReminders(NOW);
    expect(second).toEqual({ studios: 1, queued: 0, duplicates: 3 });
    expect(scheduled).toHaveLength(1);
    await scheduled[0]();
    expect(push.sendToUser).toHaveBeenCalledWith(
      "u1",
      expect.objectContaining({
        type: "measure_check",
        body: "Domani è il giorno del check: prepara metro e bilancia.",
        url: "/app/tracking",
        tag: "measure-check-2026-12-01",
      }),
      12 * 60 * 60,
    );
  });

  it("fuori dalle 6 non fa nulla", async () => {
    const report = await service.sendMeasureCheckReminders(
      new Date("2026-11-30T06:00:00Z"),
    );
    expect(report.studios).toBe(0);
    expect(repo.listMeasureCheckCandidates).not.toHaveBeenCalled();
  });
});
