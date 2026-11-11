import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Uscita (fase 7) con i repository simulati: sottoscrizioni push eliminate
 * prima di chiudere la sessione, per endpoint o tutte; un errore sulle
 * sottoscrizioni non impedisce l'uscita.
 */

vi.mock("@/server/repositories/auth.repository", () => ({
  signOut: vi.fn(async () => ({ ok: true, error: null })),
}));
vi.mock("@/server/repositories/push.repository", () => ({
  deleteOwnSubscription: vi.fn(async () => undefined),
  deleteAllOwnSubscriptions: vi.fn(async () => undefined),
}));
vi.mock("@/server/services/session.service", () => ({
  loadSession: vi.fn(),
}));

const auth = await import("@/server/repositories/auth.repository");
const push = await import("@/server/repositories/push.repository");
const service = await import("./auth.service");

beforeEach(() => vi.clearAllMocks());

describe("uscita", () => {
  it("Esci: chiude la sessione locale e lascia attive le notifiche del dispositivo", async () => {
    await service.signOut("local", "u1");
    expect(push.deleteOwnSubscription).not.toHaveBeenCalled();
    expect(push.deleteAllOwnSubscriptions).not.toHaveBeenCalled();
    expect(auth.signOut).toHaveBeenCalledWith("local");
  });

  it("Esci da tutti i dispositivi: elimina tutte le sottoscrizioni, poi chiude ogni sessione", async () => {
    await service.signOut("global", "u1");
    expect(push.deleteAllOwnSubscriptions).toHaveBeenCalledWith("u1");
    expect(auth.signOut).toHaveBeenCalledWith("global");
    expect(
      vi.mocked(push.deleteAllOwnSubscriptions).mock.invocationCallOrder[0],
    ).toBeLessThan(vi.mocked(auth.signOut).mock.invocationCallOrder[0]);
  });

  it("un errore sulle sottoscrizioni non impedisce l'uscita", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(push.deleteAllOwnSubscriptions).mockRejectedValueOnce(
      Object.assign(new Error("x"), { code: "42501" }),
    );
    await service.signOut("global", "u1");
    expect(auth.signOut).toHaveBeenCalledWith("global");
  });
});
