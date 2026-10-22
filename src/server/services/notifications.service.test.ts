import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * notifyClient (N-06): l'invio parte dopo la risposta (after) e un errore
 * non arriva mai a chi pubblica il file.
 */

const scheduled: (() => Promise<void>)[] = [];
vi.mock("next/server", () => ({
  after: vi.fn((callback: () => Promise<void>) => scheduled.push(callback)),
}));
vi.mock("@/server/services/push.service", () => ({
  sendToClient: vi.fn(async () => ({
    status: "sent",
    delivered: 1,
    removed: 0,
    failed: 0,
  })),
}));

const push = await import("@/server/services/push.service");
const service = await import("./notifications.service");

beforeEach(() => {
  vi.clearAllMocks();
  scheduled.length = 0;
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("notifyClient", () => {
  it("non invia subito: programma l'invio dopo la risposta", async () => {
    service.notifyClient("c1", { type: "file_published" });
    expect(push.sendToClient).not.toHaveBeenCalled();
    expect(scheduled).toHaveLength(1);

    await scheduled[0]();
    expect(push.sendToClient).toHaveBeenCalledWith("c1", expect.any(Function));
    // il contenuto lo costruisce buildNotification con il solo nome dello studio
    const build = vi.mocked(push.sendToClient).mock.calls[0][1];
    expect(build({ name: "Studio Verde" })).toMatchObject({
      title: "Studio Verde",
      url: "/app",
    });
  });

  it("un errore dell'invio resta nei log e non lancia", async () => {
    vi.mocked(push.sendToClient).mockRejectedValueOnce(new Error("boom"));
    service.notifyClient("c1", { type: "file_published" });
    await expect(scheduled[0]()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});
