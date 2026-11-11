import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Libreria video (mockup v4): il link si riverifica sul server anche se il
 * form l'ha già verificato, la notifica parte solo con "Avvisa i clienti",
 * il cliente non vede cartelle vuote e "Nuovo" sparisce dopo l'apertura.
 */

const STUDIO = "studio-1";
const folders = [
  {
    id: "A",
    parentId: null,
    name: "Ricette",
    description: null,
    visibleInOnboarding: false,
    sortOrder: 2,
  },
  {
    id: "B",
    parentId: null,
    name: "Benvenuto",
    description: null,
    visibleInOnboarding: true,
    sortOrder: 1,
  },
  {
    id: "A1",
    parentId: "A",
    name: "Colazioni",
    description: null,
    visibleInOnboarding: false,
    sortOrder: 1,
  },
  {
    id: "E",
    parentId: null,
    name: "Vuota",
    description: null,
    visibleInOnboarding: false,
    sortOrder: 3,
  },
];
const today = new Date().toISOString();
const videos = [
  {
    id: "v1",
    folderId: "A",
    youtubeId: "aaaaaaaaaaa",
    title: "Uno",
    note: null,
    sortOrder: 1,
    createdAt: today,
    unavailableAt: null,
  },
  {
    id: "v2",
    folderId: "A1",
    youtubeId: "bbbbbbbbbbb",
    title: "Due",
    note: null,
    sortOrder: 1,
    createdAt: "2020-01-01T10:00:00Z",
    unavailableAt: null,
  },
  {
    id: "v3",
    folderId: "B",
    youtubeId: "ccccccccccc",
    title: "Tre",
    note: null,
    sortOrder: 1,
    createdAt: today,
    unavailableAt: null,
  },
];

vi.mock("@/server/repositories/videos.repository", () => ({
  listFolders: vi.fn(async () => folders),
  listVideos: vi.fn(async () => videos),
  listOwnViewedVideoIds: vi.fn(async () => new Set(["v3"])),
  countViewsByVideo: vi.fn(async () => new Map([["v1", 4]])),
  countActiveClientsByStage: vi.fn(async () => ({ total: 10, onboarding: 3 })),
  insertVideo: vi.fn(async () => ({ ok: true, id: "new-video" })),
  insertFolder: vi.fn(async () => "new-folder"),
}));
vi.mock("@/server/repositories/youtube.repository", () => ({
  fetchOembed: vi.fn(async () => ({
    status: 200,
    title: "Da YouTube",
    authorName: "Studio",
  })),
}));
vi.mock("@/server/services/notifications.service", () => ({
  notifyNewVideo: vi.fn(),
}));

const repository = await import("@/server/repositories/videos.repository");
const youtube = await import("@/server/repositories/youtube.repository");
const notifications = await import("@/server/services/notifications.service");
const service = await import("./videos.service");

const ADD = {
  url: "https://youtu.be/ddddddddddd",
  title: "Nuovo",
  folderId: "A",
  note: null,
  notify: false,
};

beforeEach(() => vi.clearAllMocks());

describe("addVideo", () => {
  it("riverifica il link sul server e salva solo l'id di YouTube", async () => {
    await expect(service.addVideo(STUDIO, ADD)).resolves.toEqual({
      ok: true,
      id: "new-video",
    });
    expect(youtube.fetchOembed).toHaveBeenCalledWith("ddddddddddd");
    expect(repository.insertVideo).toHaveBeenCalledWith(
      expect.objectContaining({ youtubeId: "ddddddddddd", folderId: "A" }),
    );
    expect(notifications.notifyNewVideo).not.toHaveBeenCalled();
  });

  it("avvisa i clienti solo se richiesto", async () => {
    await service.addVideo(STUDIO, { ...ADD, notify: true });
    expect(notifications.notifyNewVideo).toHaveBeenCalledWith("new-video");
  });

  it.each([
    [401, "not_embeddable"],
    [404, "unavailable"],
    [503, "check_failed"],
  ] as const)("oEmbed %i: non salva (%s)", async (status, reason) => {
    vi.mocked(youtube.fetchOembed).mockResolvedValueOnce({
      status,
      title: null,
      authorName: null,
    });
    await expect(service.addVideo(STUDIO, ADD)).resolves.toEqual({
      ok: false,
      reason,
    });
    expect(repository.insertVideo).not.toHaveBeenCalled();
  });

  it("rifiuta un link che non è di YouTube senza chiamare YouTube", async () => {
    await expect(
      service.addVideo(STUDIO, { ...ADD, url: "https://vimeo.com/123" }),
    ).resolves.toEqual({ ok: false, reason: "invalid_link" });
    expect(youtube.fetchOembed).not.toHaveBeenCalled();
  });

  it("rifiuta una cartella che non è dello studio", async () => {
    await expect(
      service.addVideo(STUDIO, { ...ADD, folderId: "altro" }),
    ).resolves.toEqual({ ok: false, reason: "folder_not_found" });
  });
});

describe("createFolder", () => {
  it("una sottocartella non sceglie la visibilità e non sta in un'altra sottocartella", async () => {
    await service.createFolder(STUDIO, {
      name: "Pranzi",
      description: null,
      visibility: "onboarding",
      parentId: "A",
    });
    expect(repository.insertFolder).toHaveBeenCalledWith(
      expect.objectContaining({ parentId: "A", visibleInOnboarding: false }),
    );
    await expect(
      service.createFolder(STUDIO, {
        name: "Terzo livello",
        description: null,
        visibility: "active",
        parentId: "A1",
      }),
    ).resolves.toEqual({ ok: false, reason: "invalid_parent" });
  });
});

describe("getVideoLibrary", () => {
  it("albero ordinato, conteggi con le sottocartelle e pubblico della cartella", async () => {
    const library = await service.getVideoLibrary(STUDIO, "A");
    expect(library.tree.map((f) => f.id)).toEqual(["B", "A", "E"]);
    expect(library.tree.find((f) => f.id === "A")?.videoCount).toBe(2);
    expect(library.selected?.audience).toBe(7);
    expect(library.selected?.videos).toEqual([
      expect.objectContaining({ id: "v1", openedBy: 4, recent: true }),
    ]);
    expect(library.folderOptions.map((o) => o.label)).toContain(
      "Ricette › Colazioni",
    );
    expect(library.folderOptions.find((o) => o.id === "B")?.audience).toBe(10);
  });
});

describe("cliente", () => {
  it("niente cartelle vuote; nuovi = recenti e non aperti", async () => {
    const home = await service.getClientVideoHome();
    expect(home.folders.map((f) => f.id)).toEqual(["B", "A"]);
    expect(home.newCount).toBe(1); // v1 (v3 già aperto, v2 vecchio)
    expect(
      home.folders.find((f) => f.id === "A")?.children.map((c) => c.id),
    ).toEqual(["A1"]);
  });

  it("un video si apre solo dalla sua cartella", async () => {
    await expect(service.getClientVideo("A1", "v1", 3)).resolves.toBeNull();
    const detail = await service.getClientVideo("A", "v1", 3);
    expect(detail?.video.id).toBe("v1");
    expect(detail?.related).toEqual([]);
  });
});
