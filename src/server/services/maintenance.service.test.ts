import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Manutenzione giornaliera (fase 9): passaggi indipendenti, log con soli
 * conteggi (mai percorsi degli oggetti o dati dei clienti).
 */

const ORPHAN = "studio/cliente/00000000-0000-4000-a000-000000000001.pdf";

vi.mock("@/server/repositories/maintenance.repository", () => ({
  ping: vi.fn(async () => {}),
  listOrphanUploads: vi.fn(async () => [ORPHAN]),
  removeClientFileObjects: vi.fn(async (paths: string[]) => paths.length),
  purgeExpiredInvites: vi.fn(async () => 3),
<<<<<<< Updated upstream
=======
  purgeNotificationLog: vi.fn(async () => 7),
  listVideosToRecheck: vi.fn(async () => [
    { id: "v1", youtubeId: "aaaaaaaaaaa", unavailable: false },
    { id: "v2", youtubeId: "bbbbbbbbbbb", unavailable: true },
    { id: "v3", youtubeId: "ccccccccccc", unavailable: false },
    { id: "v4", youtubeId: "ddddddddddd", unavailable: false },
  ]),
  saveVideoAvailability: vi.fn(async () => {}),
}));

// v1 riproducibile, v2 di nuovo riproducibile, v3 rimosso, v4 YouTube in errore
const OEMBED: Record<string, number | "network_error"> = {
  aaaaaaaaaaa: 200,
  bbbbbbbbbbb: 200,
  ccccccccccc: 404,
  ddddddddddd: 503,
};
vi.mock("@/server/repositories/youtube.repository", () => ({
  fetchOembed: vi.fn(async (id: string) => {
    const status = OEMBED[id];
    return status === "network_error"
      ? { status }
      : { status, title: null, authorName: null };
  }),
>>>>>>> Stashed changes
}));

const repository = await import("@/server/repositories/maintenance.repository");
const service = await import("./maintenance.service");

const logs: string[] = [];

beforeEach(() => {
  vi.clearAllMocks();
  logs.length = 0;
  for (const level of ["info", "error"] as const) {
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });
  }
});

describe("runMaintenance", () => {
  it("esegue keep-alive, pulizia degli orfani e degli inviti con i limiti previsti", async () => {
    const report = await service.runMaintenance();
    expect(report).toMatchObject({
      ok: true,
      orphanUploadsRemoved: 1,
      expiredInvitesDeleted: 3,
      failed: [],
    });
    expect(repository.ping).toHaveBeenCalled();
    expect(repository.listOrphanUploads).toHaveBeenCalledWith(24);
    expect(repository.removeClientFileObjects).toHaveBeenCalledWith([ORPHAN]);
    expect(repository.purgeExpiredInvites).toHaveBeenCalledWith(90);
  });

  it("ricontrolla i video: segna i non disponibili, ripristina gli altri, ignora gli errori di YouTube", async () => {
    const report = await service.runMaintenance();
    expect(report).toMatchObject({ videosChecked: 3, videosUnavailable: 1 });
    const saved = vi
      .mocked(repository.saveVideoAvailability)
      .mock.calls.map(([video, available]) => [video.id, available]);
    expect(saved).toEqual(
      expect.arrayContaining([
        ["v1", true],
        ["v2", true],
        ["v3", false],
      ]),
    );
    expect(saved.some(([id]) => id === "v4")).toBe(false);
  });

  it("un passaggio fallito non ferma gli altri", async () => {
    vi.mocked(repository.listOrphanUploads).mockRejectedValueOnce(
      Object.assign(new Error(`oggetto ${ORPHAN} non trovato`), {
        code: "XX000",
      }),
    );
    const report = await service.runMaintenance();
    expect(report.ok).toBe(false);
    expect(report.failed).toEqual(["orphanUploads"]);
    expect(report.expiredInvitesDeleted).toBe(3);
  });

  it("non scrive mai nei log percorsi o messaggi degli errori", async () => {
    vi.mocked(repository.purgeExpiredInvites).mockRejectedValueOnce(
      new Error(`errore su ${ORPHAN}`),
    );
    await service.runMaintenance();
    expect(logs.join("\n")).not.toContain(ORPHAN);
    expect(logs.some((line) => line.startsWith("[manutenzione]"))).toBe(true);
  });
});
