import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Servizio del tracking con il repository simulato: permessi per fase,
 * misure di un altro studio, validazione con i limiti della misura,
 * check-in di oggi e di ieri, obiettivo effettivo nella scala dei voti.
 */

const STUDIO = "aaaaaaaa-1111-4000-8000-000000000000";
const CLIENT = "aaaaaaaa-2222-4000-8000-000000000001";
const OTHER_CLIENT = "aaaaaaaa-2222-4000-8000-000000000002";

const metricRow = (
  key: string,
  frequency: string,
  extra: Record<string, unknown> = {},
) => ({
  id: `m-${key}`,
  key,
  name: key,
  unit: frequency === "monthly_30d" ? "cm" : "voto",
  value_type: frequency === "monthly_30d" ? "decimal" : "score_1_5",
  frequency,
  min_value: frequency === "monthly_30d" ? 10 : 1,
  max_value: frequency === "monthly_30d" ? 250 : frequency === "daily" ? 5 : 10,
  icon: "ruler",
  instructions: null,
  sort_order: 0,
  default_goal: null,
  goal_unit: null,
  ...extra,
});

const db = {
  metrics: [
    metricRow("circ_waist", "monthly_30d"),
    metricRow("water", "daily", {
      default_goal: 2,
      goal_unit: "L",
      sort_order: 80,
    }),
    metricRow("steps", "daily", {
      default_goal: 8000,
      goal_unit: "passi",
      sort_order: 60,
    }),
    metricRow("workouts", "per_session", { value_type: "score_1_10" }),
  ],
  goals: [] as { metric_id: string; goal_value: number }[],
  entries: [] as {
    id: string;
    client_id: string;
    metric_id: string;
    value: number;
    recorded_on: string;
    note: string | null;
    created_at: string;
  }[],
};

vi.mock("@/server/repositories/tracking.repository", () => ({
  listMetrics: vi.fn(async () => db.metrics),
  listGoals: vi.fn(async () => db.goals),
  listEntries: vi.fn(async (clientId: string) =>
    db.entries.filter((entry) => entry.client_id === clientId),
  ),
  getEntry: vi.fn(
    async (id: string) => db.entries.find((entry) => entry.id === id) ?? null,
  ),
  insertEntry: vi.fn(async () => "ok"),
  updateEntry: vi.fn(async () => "ok"),
  deleteEntry: vi.fn(async () => "ok"),
  saveDailyCheckin: vi.fn(async () => "ok"),
  upsertGoals: vi.fn(async () => undefined),
  deleteGoals: vi.fn(async () => undefined),
}));

vi.mock("@/server/repositories/clients.repository", () => ({
  getClientProfile: vi.fn(async (id: string) =>
    id === CLIENT
      ? { id, studio_id: STUDIO, first_name: "Anna", last_name: "Rossi" }
      : null,
  ),
}));

const repository = await import("@/server/repositories/tracking.repository");
const service = await import("./tracking.service");

const ACTOR = { clientId: CLIENT, studioId: STUDIO, canWrite: true };
const READ_ONLY = { ...ACTOR, canWrite: false };

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-14T08:00:00Z")); // mercoledì 14 a Roma
  vi.clearAllMocks();
  db.goals = [];
  db.entries = [
    {
      id: "e-water",
      client_id: CLIENT,
      metric_id: "m-water",
      value: 3,
      recorded_on: "2026-10-13",
      note: null,
      created_at: "2026-10-13T20:00:00Z",
    },
    {
      id: "e-other",
      client_id: OTHER_CLIENT,
      metric_id: "m-circ_waist",
      value: 80,
      recorded_on: "2026-10-10",
      note: null,
      created_at: "2026-10-10T20:00:00Z",
    },
  ];
});
afterEach(() => vi.useRealTimers());

const profile = (
  journeyStage: "onboarding" | "in_progress" | "paused" | "completed",
) => ({
  client: {
    id: CLIENT,
    firstName: "Anna",
    lastName: null,
    journeyStage,
    unlocked: journeyStage !== "onboarding",
  },
  studio: { id: STUDIO },
});

describe("clientTrackingActor", () => {
  it("scrive solo In percorso; In pausa e Concluso in sola lettura", () => {
    expect(service.clientTrackingActor(profile("in_progress"))?.canWrite).toBe(
      true,
    );
    expect(service.clientTrackingActor(profile("paused"))?.canWrite).toBe(
      false,
    );
    expect(service.clientTrackingActor(profile("completed"))?.canWrite).toBe(
      false,
    );
  });

  it("in Onboarding il tracking è bloccato", () => {
    expect(service.clientTrackingActor(profile("onboarding"))).toBeNull();
  });
});

describe("scritture in sola lettura", () => {
  it("nessuna scrittura arriva al repository", async () => {
    expect(
      await service.saveCheckin(READ_ONLY, {
        day: "today",
        values: { water: 4 },
      }),
    ).toEqual({ ok: false, reason: "read_only" });
    expect(
      await service.addEntry(READ_ONLY, "m-circ_waist", {
        value: "80",
        recordedOn: "2026-10-14",
      }),
    ).toEqual({ ok: false, reason: "read_only" });
    expect(
      await service.updateEntry(READ_ONLY, "e-water", { value: 4 }),
    ).toEqual({
      ok: false,
      reason: "read_only",
    });
    expect(await service.deleteEntry(READ_ONLY, "e-water")).toEqual({
      ok: false,
      reason: "read_only",
    });
    expect(repository.saveDailyCheckin).not.toHaveBeenCalled();
    expect(repository.insertEntry).not.toHaveBeenCalled();
    expect(repository.updateEntry).not.toHaveBeenCalled();
    expect(repository.deleteEntry).not.toHaveBeenCalled();
  });
});

describe("saveCheckin", () => {
  it("ieri = il giorno prima di oggi a Roma", async () => {
    const result = await service.saveCheckin(ACTOR, {
      day: "yesterday",
      values: { water: 4, steps: 2 },
    });
    expect(result).toEqual({ ok: true, date: "2026-10-13" });
    expect(repository.saveDailyCheckin).toHaveBeenCalledWith(
      CLIENT,
      "2026-10-13",
      { water: 4, steps: 2 },
    );
  });

  it("dopo la mezzanotte di Roma 'oggi' è il giorno nuovo", async () => {
    vi.setSystemTime(new Date("2026-10-14T22:30:00Z"));
    const result = await service.saveCheckin(ACTOR, {
      day: "today",
      values: { water: 4 },
    });
    expect(result).toEqual({ ok: true, date: "2026-10-15" });
  });

  it("rifiuta misure che non sono abitudini dello studio", async () => {
    expect(
      await service.saveCheckin(ACTOR, {
        day: "today",
        values: { circ_waist: 3 },
      }),
    ).toEqual({ ok: false, reason: "not_found" });
    expect(repository.saveDailyCheckin).not.toHaveBeenCalled();
  });

  it("il rifiuto del database arriva come out_of_range", async () => {
    vi.mocked(repository.saveDailyCheckin).mockResolvedValueOnce(
      "out_of_range",
    );
    expect(
      await service.saveCheckin(ACTOR, { day: "today", values: { water: 4 } }),
    ).toEqual({ ok: false, reason: "out_of_range" });
  });
});

describe("addEntry", () => {
  it("valida il valore con i limiti della misura prima di scrivere", async () => {
    const result = await service.addEntry(ACTOR, "m-circ_waist", {
      value: "300",
      recordedOn: "2026-10-14",
    });
    expect(result).toMatchObject({ ok: false, reason: "invalid" });
    expect(
      result.ok === false &&
        result.reason === "invalid" &&
        result.fieldErrors.value,
    ).toEqual(["Il valore deve essere tra 10 e 250 cm."]);
    expect(repository.insertEntry).not.toHaveBeenCalled();
  });

  it("salva la circonferenza con la virgola convertita", async () => {
    expect(
      await service.addEntry(ACTOR, "m-circ_waist", {
        value: "76,4",
        recordedOn: "2026-10-14",
      }),
    ).toEqual({ ok: true, metricKey: "circ_waist" });
    expect(repository.insertEntry).toHaveBeenCalledWith({
      studioId: STUDIO,
      clientId: CLIENT,
      metricId: "m-circ_waist",
      value: 76.4,
      recordedOn: "2026-10-14",
      note: null,
    });
  });

  it("le abitudini passano dal check-in, le misure sconosciute non esistono", async () => {
    expect(
      await service.addEntry(ACTOR, "m-water", {
        value: 3,
        recordedOn: "2026-10-14",
      }),
    ).toEqual({ ok: false, reason: "not_found" });
    expect(
      await service.addEntry(ACTOR, "m-altro", {
        value: "80",
        recordedOn: "2026-10-14",
      }),
    ).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("updateEntry e deleteEntry", () => {
  it("una registrazione di un altro cliente non si tocca", async () => {
    expect(
      await service.updateEntry(ACTOR, "e-other", {
        value: "81",
        recordedOn: "2026-10-10",
      }),
    ).toEqual({
      ok: false,
      reason: "not_found",
    });
    expect(await service.deleteEntry(ACTOR, "e-other")).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("per un'abitudine si corregge solo il voto, non il giorno", async () => {
    await service.updateEntry(ACTOR, "e-water", {
      value: 5,
      recordedOn: "2026-10-01",
    });
    expect(repository.updateEntry).toHaveBeenCalledWith("e-water", {
      value: 5,
      note: null,
    });
  });

  it("la RLS che nasconde la riga diventa sola lettura", async () => {
    vi.mocked(repository.deleteEntry).mockResolvedValueOnce("forbidden");
    expect(await service.deleteEntry(ACTOR, "e-water")).toEqual({
      ok: false,
      reason: "read_only",
    });
  });
});

describe("getCheckin", () => {
  it("precarica i voti del giorno scelto e ordina passi, sonno, acqua", async () => {
    const checkin = await service.getCheckin(ACTOR, "yesterday");
    expect(checkin.date).toBe("2026-10-13");
    expect(checkin.habits.map((habit) => habit.key)).toEqual([
      "steps",
      "water",
    ]);
    expect(checkin.habits.find((habit) => habit.key === "water")?.value).toBe(
      3,
    );
    const today = await service.getCheckin(ACTOR, "today");
    expect(today.habits.every((habit) => habit.value === null)).toBe(true);
  });

  it("la scala dei voti segue l'obiettivo personale, se c'è", async () => {
    const before = await service.getCheckin(ACTOR, "today");
    const water = () => before.habits.find((habit) => habit.key === "water")!;
    expect(water().scale?.[0]?.amount).toBe("2 L o più");

    db.goals = [{ metric_id: "m-water", goal_value: 3 }];
    const after = await service.getCheckin(ACTOR, "today");
    const personal = after.habits.find((habit) => habit.key === "water")!;
    expect(personal.goal).toMatchObject({ value: 3, personal: true });
    expect(personal.scale?.map((row) => row.amount)).toEqual([
      "3 L o più",
      "circa 2,5 L",
      "circa 1,5 L",
      "circa 1 L",
      "meno di 1 L",
    ]);
  });
});

describe("getClientMetricDetail", () => {
  it("non mostra le registrazioni di altri clienti e restituisce null per una chiave sconosciuta", async () => {
    const detail = await service.getClientMetricDetail(ACTOR, "circ_waist");
    expect(detail?.item.entries).toHaveLength(0);
    expect(
      await service.getClientMetricDetail(ACTOR, "inesistente"),
    ).toBeNull();
  });
});

describe("getHomeToRecord", () => {
  it("in sola lettura non propone nulla da registrare", async () => {
    expect(await service.getHomeToRecord(READ_ONLY)).toEqual([]);
    expect((await service.getHomeToRecord(ACTOR)).length).toBeGreaterThan(0);
  });
});

describe("area admin", () => {
  it("lo staff di un altro studio non vede il cliente", async () => {
    expect(await service.getStaffTracking("altro-studio", CLIENT)).toBeNull();
    expect(
      await service.saveGoals("altro-studio", CLIENT, { water: 3 }),
    ).toEqual({ ok: false, reason: "not_found" });
    expect(repository.upsertGoals).not.toHaveBeenCalled();
  });

  it("obiettivi effettivi: personale se c'è, altrimenti dello studio", async () => {
    db.goals = [{ metric_id: "m-water", goal_value: 2.5 }];
    const tracking = await service.getStaffTracking(STUDIO, CLIENT);
    expect(tracking?.clientName).toBe("Anna Rossi");
    expect(
      tracking?.goals.map((g) => [g.key, g.goal.value, g.goal.personal]),
    ).toEqual([
      ["steps", 8000, false],
      ["water", 2.5, true],
    ]);
  });

  it("un valore uguale al predefinito elimina l'obiettivo personale", async () => {
    expect(
      await service.saveGoals(STUDIO, CLIENT, { water: 2, steps: 10000 }),
    ).toEqual({ ok: true });
    expect(repository.upsertGoals).toHaveBeenCalledWith([
      {
        studioId: STUDIO,
        clientId: CLIENT,
        metricId: "m-steps",
        goalValue: 10000,
      },
    ]);
    expect(repository.deleteGoals).toHaveBeenCalledWith(CLIENT, ["m-water"]);
  });

  it("ripristina predefinito", async () => {
    expect(await service.resetGoal(STUDIO, CLIENT, "water")).toEqual({
      ok: true,
    });
    expect(repository.deleteGoals).toHaveBeenCalledWith(CLIENT, ["m-water"]);
  });

  it("dettaglio di una misura in sola consultazione", async () => {
    const detail = await service.getStaffMetricDetail(STUDIO, CLIENT, "water");
    expect(detail?.canWrite).toBe(false);
    expect(detail?.scale?.[0]?.amount).toBe("2 L o più");
    expect(await service.getStaffMetricDetail(STUDIO, CLIENT, "x")).toBeNull();
  });
});
