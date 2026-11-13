import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Foto di avanzamento con Supabase simulato: sessioni di un percorso di 1
 * anno (check con le foto 3, 6, 9 e 11, l'ultimo), set e foto in memoria, Storage finto
 * con l'intestazione dell'oggetto caricato. "Oggi" è il 2 novembre 2026.
 */

const STUDIO = "aaaaaaaa-1111-4000-8000-000000000000";
const OTHER_STUDIO = "bbbbbbbb-1111-4000-8000-000000000000";
const CLIENT = "aaaaaaaa-2222-4000-8000-000000000001";
const JOURNEY = "aaaaaaaa-3333-4000-8000-000000000001";
const sessionId = (position: number) =>
  `aaaaaaaa-4444-4000-8000-${String(position).padStart(12, "0")}`;
const SET = "aaaaaaaa-5555-4000-8000-000000000001";
const OBJECT = "aaaaaaaa-6666-4000-8000-000000000001";

/** Onboarding ad aprile e check 3 il 30 ottobre (aperti), check 6 e 9 nel 2027. */
const DATES: Record<number, string> = {
  0: "2026-04-01",
  3: "2026-10-30",
  6: "2027-01-30",
  9: "2027-04-30",
  11: "2027-06-30",
};

type FakePhoto = {
  id: string;
  view: string;
  storage_path: string;
  size_bytes: number;
  uploaded_by_role: string;
  uploaded_at: string;
};
type FakeSet = {
  id: string;
  session_id: string;
  studio_id: string;
  client_id: string;
  status: "draft" | "saved";
  saved_at: string | null;
  saved_by_role: string | null;
  photos: FakePhoto[];
};

const db = {
  sets: [] as FakeSet[],
  objects: new Map<string, Uint8Array>(),
  removed: [] as string[],
  journeyStatus: "active",
};

const JFIF = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46, 0xff, 0xda, 0x00, 0x02,
]);
const WITH_EXIF = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe1, 0x00, 0x04, 0x45, 0x78, 0xff, 0xda, 0x00, 0x02,
]);

function sessions() {
  return Array.from({ length: 12 }, (_, position) => ({
    id: sessionId(position),
    journey_id: JOURNEY,
    studio_id: STUDIO,
    client_id: CLIENT,
    position,
    type: position === 0 ? "onboarding" : "check",
    calculated_date: DATES[position] ?? `2026-0${Math.min(position, 9)}-01`,
    custom_date: null,
    session_time: null,
    status: "todo",
    client_journeys: {
      duration_months: 12,
      status: db.journeyStatus,
      created_at: "2026-04-01T00:00:00Z",
    },
  }));
}

vi.mock("@/lib/domain/tracking/dates", async (original) => ({
  ...(await original<object>()),
  todayInRome: () => "2026-11-02",
}));

vi.mock("@/server/repositories/clients.repository", () => ({
  getClientProfile: vi.fn(async (id: string) =>
    id === CLIENT
      ? {
          id,
          studio_id: STUDIO,
          first_name: "Giulia",
          last_name: "Bianchi",
          push_enabled: true,
        }
      : null,
  ),
}));

vi.mock("@/server/repositories/journeys.repository", () => ({
  listOwnJourneys: vi.fn(async () => [
    { id: JOURNEY, number: 1, duration_months: 12, status: db.journeyStatus },
  ]),
  listOwnSessions: vi.fn(async () =>
    sessions().map((s) => ({
      id: s.id,
      journey_id: s.journey_id,
      seq: s.position,
      type: s.type,
      session_date: s.calculated_date,
      status: s.status,
    })),
  ),
}));

vi.mock("@/server/repositories/photos.repository", () => ({
  listStaffSessions: vi.fn(async () => sessions()),
  getStaffSession: vi.fn(async (id: string) => {
    const session = sessions().find((s) => s.id === id);
    if (!session) return null;
    return {
      ...session,
      client_journeys: {
        ...session.client_journeys,
        journey_sessions: sessions().map(({ id: sid, position, type }) => ({
          id: sid,
          position,
          type,
        })),
      },
    };
  }),
  listSetsOfClient: vi.fn(async () => db.sets),
  getSetBySession: vi.fn(
    async (id: string) => db.sets.find((s) => s.session_id === id) ?? null,
  ),
  listPhotoReminders: vi.fn(async () => []),
  ensureSet: vi.fn(async (id: string) => {
    if (!db.sets.some((s) => s.session_id === id)) {
      db.sets.push({
        id: SET,
        session_id: id,
        studio_id: STUDIO,
        client_id: CLIENT,
        status: "draft",
        saved_at: null,
        saved_by_role: null,
        photos: [],
      });
    }
    return { ok: true };
  }),
  createSignedUploadUrl: vi.fn(
    async (path: string) => `https://upload/${path}`,
  ),
  getObjectInfo: vi.fn(async (path: string) => {
    const bytes = db.objects.get(path);
    return bytes ? { size: bytes.length } : null;
  }),
  readObjectHead: vi.fn(async (path: string) => db.objects.get(path) ?? null),
  removeObjects: vi.fn(async (paths: string[]) => {
    db.removed.push(...paths);
    return null;
  }),
  createSignedUrls: vi.fn(
    async (paths: string[]) =>
      new Map(paths.map((p) => [p, `https://view/${p}`])),
  ),
  insertPhoto: vi.fn(
    async (row: {
      setId: string;
      view: string;
      storagePath: string;
      sizeBytes: number;
    }) => {
      const set = db.sets.find((s) => s.id === row.setId)!;
      if (set.photos.some((p) => p.view === row.view)) return "duplicate";
      set.photos.push({
        id: `p-${row.view}`,
        view: row.view,
        storage_path: row.storagePath,
        size_bytes: row.sizeBytes,
        uploaded_by_role: "studio",
        uploaded_at: "2026-11-02T08:00:00Z",
      });
      return "ok";
    },
  ),
  replacePhoto: vi.fn(
    async (row: { setId: string; view: string; storagePath: string }) => {
      const photo = db.sets
        .find((s) => s.id === row.setId)!
        .photos.find((p) => p.view === row.view)!;
      const previousPath = photo.storage_path;
      photo.storage_path = row.storagePath;
      return { ok: true, previousPath };
    },
  ),
  deletePhoto: vi.fn(),
  saveSet: vi.fn(async (setId: string) => {
    const set = db.sets.find((s) => s.id === setId)!;
    if (set.photos.length < 3) return "incomplete";
    set.status = "saved";
    set.saved_at = "2026-11-02T09:00:00Z";
    set.saved_by_role = "studio";
    return "ok";
  }),
}));

vi.mock("node:crypto", async (original) => ({
  ...(await original<object>()),
  randomUUID: () => OBJECT,
}));

const service = await import("./photos.service");

const staff = { kind: "staff", studioId: STUDIO } as const;

function addPhoto(
  view: string,
  path = `${STUDIO}/${CLIENT}/${SET}/${view}-old.jpg`,
) {
  db.sets[0]!.photos.push({
    id: `p-${view}`,
    view,
    storage_path: path,
    size_bytes: 10,
    uploaded_by_role: "client",
    uploaded_at: "2026-10-30T08:00:00Z",
  });
}

beforeEach(async () => {
  db.sets = [];
  db.objects.clear();
  db.removed = [];
  db.journeyStatus = "active";
});

describe("getStaffPhotos", () => {
  it("prima i set aperti (anche le foto di partenza), poi i prossimi dal più vicino", async () => {
    const data = await service.getStaffPhotos(STUDIO, CLIENT);
    expect(data?.sets.map((s) => [s.label, s.state])).toEqual([
      ["Check 3", "to_upload"],
      ["Onboarding", "to_upload"],
      ["Check 6", "future"],
      ["Check 9", "future"],
      ["Check 11", "future"],
    ]);
    expect(data?.sets[0]?.canEdit).toBe(true);
    expect(data?.sets[2]?.canEdit).toBe(false);
  });

  it("un set salvato va dopo quelli aperti, senza comandi", async () => {
    await service.preparePhotoUpload(staff, {
      sessionId: sessionId(3),
      view: "front",
    });
    addPhoto("front");
    addPhoto("side");
    addPhoto("back");
    db.sets[0]!.status = "saved";
    const data = await service.getStaffPhotos(STUDIO, CLIENT);
    // il set aperto (onboarding) resta sopra
    expect(data?.sets.map((s) => s.label).slice(0, 2)).toEqual([
      "Onboarding",
      "Check 3",
    ]);
    expect(data?.sets[1]).toMatchObject({ state: "saved", canEdit: false });
    expect(data?.sets[1]?.photos.map((p) => p.url)).toEqual([
      `https://view/${STUDIO}/${CLIENT}/${SET}/front-old.jpg`,
      `https://view/${STUDIO}/${CLIENT}/${SET}/side-old.jpg`,
      `https://view/${STUDIO}/${CLIENT}/${SET}/back-old.jpg`,
    ]);
    expect(data?.savedCount).toBe(1);
  });

  it("di un percorso concluso non mostra i check futuri", async () => {
    db.journeyStatus = "concluded";
    const data = await service.getStaffPhotos(STUDIO, CLIENT);
    expect(data?.sets).toEqual([]);
  });

  it("null per il cliente di un altro studio", async () => {
    expect(await service.getStaffPhotos(OTHER_STUDIO, CLIENT)).toBeNull();
  });
});

describe("getClientPhotos", () => {
  it("in pausa o concluso il cliente vede ma non modifica", async () => {
    const data = await service.getClientPhotos(CLIENT, false);
    expect(data.sets[0]).toMatchObject({ state: "to_upload", canEdit: false });
  });
});

describe("preparePhotoUpload", () => {
  it("apre il set e firma un percorso costruito dal server", async () => {
    const result = await service.preparePhotoUpload(staff, {
      sessionId: sessionId(3),
      view: "back",
    });
    expect(result).toEqual({
      ok: true,
      objectId: OBJECT,
      uploadUrl: `https://upload/${STUDIO}/${CLIENT}/${SET}/back-${OBJECT}.jpg`,
    });
  });

  it("rifiuta un check senza foto, uno futuro, un altro studio", async () => {
    expect(
      await service.preparePhotoUpload(staff, {
        sessionId: sessionId(2),
        view: "front",
      }),
    ).toEqual({ ok: false, reason: "not_found" });
    expect(
      await service.preparePhotoUpload(staff, {
        sessionId: sessionId(6),
        view: "front",
      }),
    ).toEqual({ ok: false, reason: "not_open" });
    expect(
      await service.preparePhotoUpload(
        { kind: "staff", studioId: OTHER_STUDIO },
        { sessionId: sessionId(3), view: "front" },
      ),
    ).toEqual({ ok: false, reason: "not_found" });
  });

  it("il cliente fuori da In percorso non carica", async () => {
    expect(
      await service.preparePhotoUpload(
        {
          kind: "client",
          clientId: CLIENT,
          canWrite: false,
          onboardingOnly: false,
        },
        { sessionId: sessionId(3), view: "front" },
      ),
    ).toEqual({ ok: false, reason: "read_only" });
  });

  it("un set salvato non accetta nuove foto", async () => {
    await service.preparePhotoUpload(staff, {
      sessionId: sessionId(3),
      view: "front",
    });
    db.sets[0]!.status = "saved";
    expect(
      await service.preparePhotoUpload(staff, {
        sessionId: sessionId(3),
        view: "front",
      }),
    ).toEqual({ ok: false, reason: "saved" });
  });
});

describe("confirmPhotoUpload", () => {
  const path = (view: string) =>
    `${STUDIO}/${CLIENT}/${SET}/${view}-${OBJECT}.jpg`;

  beforeEach(async () => {
    await service.preparePhotoUpload(staff, {
      sessionId: sessionId(3),
      view: "front",
    });
  });

  it("registra un JPEG senza metadati", async () => {
    db.objects.set(path("front"), JFIF);
    const result = await service.confirmPhotoUpload(staff, {
      sessionId: sessionId(3),
      view: "front",
      objectId: OBJECT,
    });
    expect(result).toEqual({ ok: true, clientId: CLIENT });
    expect(db.sets[0]!.photos.map((p) => p.storage_path)).toEqual([
      path("front"),
    ]);
  });

  it("rifiuta ed elimina un JPEG con EXIF (posizione GPS possibile)", async () => {
    db.objects.set(path("front"), WITH_EXIF);
    const result = await service.confirmPhotoUpload(staff, {
      sessionId: sessionId(3),
      view: "front",
      objectId: OBJECT,
    });
    expect(result).toEqual({ ok: false, reason: "rejected" });
    expect(db.removed).toEqual([path("front")]);
    expect(db.sets[0]!.photos).toEqual([]);
  });

  it("oggetto mancante: caricamento non riuscito", async () => {
    expect(
      await service.confirmPhotoUpload(staff, {
        sessionId: sessionId(3),
        view: "front",
        objectId: OBJECT,
      }),
    ).toEqual({ ok: false, reason: "upload_failed" });
  });

  it("sostituisce la foto ed elimina l'oggetto precedente", async () => {
    addPhoto("front");
    db.objects.set(path("front"), JFIF);
    await service.confirmPhotoUpload(staff, {
      sessionId: sessionId(3),
      view: "front",
      objectId: OBJECT,
    });
    expect(db.sets[0]!.photos[0]!.storage_path).toBe(path("front"));
    expect(db.removed).toEqual([`${STUDIO}/${CLIENT}/${SET}/front-old.jpg`]);
  });
});

describe("savePhotoSet", () => {
  beforeEach(async () => {
    await service.preparePhotoUpload(staff, {
      sessionId: sessionId(3),
      view: "front",
    });
  });

  it("con due foto non salva", async () => {
    addPhoto("front");
    addPhoto("side");
    expect(
      await service.savePhotoSet(staff, { sessionId: sessionId(3) }),
    ).toEqual({
      ok: false,
      reason: "incomplete",
    });
  });

  it("con tre foto salva; poi non si salva di nuovo", async () => {
    addPhoto("front");
    addPhoto("side");
    addPhoto("back");
    expect(
      await service.savePhotoSet(staff, { sessionId: sessionId(3) }),
    ).toEqual({
      ok: true,
      clientId: CLIENT,
    });
    expect(
      await service.savePhotoSet(staff, { sessionId: sessionId(3) }),
    ).toEqual({
      ok: false,
      reason: "saved",
    });
  });
});
