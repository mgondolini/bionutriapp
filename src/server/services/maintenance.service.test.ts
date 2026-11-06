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
  purgeNotificationLog: vi.fn(async () => 7),
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
    expect(repository.purgeNotificationLog).toHaveBeenCalledWith(90);
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
