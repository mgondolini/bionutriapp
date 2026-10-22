import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Invio Web Push con repository e libreria simulati: tutti i dispositivi del
 * cliente, sottoscrizioni scadute (404, 410) eliminate, altri errori solo
 * nei log, nessun invio per clienti disattivati o senza chiavi VAPID.
 */

vi.mock("web-push", () => {
  class WebPushError extends Error {
    constructor(
      message: string,
      public statusCode: number,
    ) {
      super(message);
    }
  }
  return {
    default: { sendNotification: vi.fn(async () => ({ statusCode: 201 })) },
    WebPushError,
  };
});
vi.mock("@/server/repositories/push.repository", () => ({
  getClientPushTargets: vi.fn(),
  deleteSubscriptions: vi.fn(async () => undefined),
  registerOwnSubscription: vi.fn(async () => true),
  deleteOwnSubscription: vi.fn(async () => undefined),
  listOwnEndpoints: vi.fn(async () => []),
}));

const webpush = await import("web-push");
const repo = await import("@/server/repositories/push.repository");
const service = await import("./push.service");

const CLIENT = "c1";
const target = (id: string) => ({
  endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
  p256dh: "p",
  auth: "a",
});
const payload = (studio: { name: string }) => ({
  title: studio.name,
  body: "Hai un nuovo documento nella tua area riservata",
  icon: "/icon/192",
  url: "/app",
  tag: "file_published",
});
const pushError = (statusCode: number) =>
  new webpush.WebPushError("x", statusCode, {}, "", "");

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "pub");
  vi.stubEnv("VAPID_PRIVATE_KEY", "priv");
  vi.stubEnv("VAPID_SUBJECT", "mailto:test@example.test");
  vi.mocked(repo.getClientPushTargets).mockResolvedValue({
    accountStatus: "active",
    studioName: "Studio Verde",
    subscriptions: [target("a"), target("b"), target("c")],
  });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("sendToClient", () => {
  it("invia a tutti i dispositivi del cliente con il contenuto costruito", async () => {
    const outcome = await service.sendToClient(CLIENT, payload);
    expect(outcome).toEqual({
      status: "sent",
      delivered: 3,
      removed: 0,
      failed: 0,
    });
    expect(webpush.default.sendNotification).toHaveBeenCalledTimes(3);
    const [subscription, body, options] = vi.mocked(
      webpush.default.sendNotification,
    ).mock.calls[0];
    expect(subscription).toEqual({
      endpoint: target("a").endpoint,
      keys: { p256dh: "p", auth: "a" },
    });
    expect(JSON.parse(body as string)).toMatchObject({
      title: "Studio Verde",
      url: "/app",
    });
    expect(options).toMatchObject({
      TTL: 72 * 60 * 60,
      vapidDetails: { publicKey: "pub", privateKey: "priv" },
    });
  });

  it("elimina le sottoscrizioni che rispondono 404 o 410 e tiene le altre", async () => {
    vi.mocked(webpush.default.sendNotification)
      .mockRejectedValueOnce(pushError(410))
      .mockRejectedValueOnce(pushError(500))
      .mockRejectedValueOnce(pushError(404));
    const outcome = await service.sendToClient(CLIENT, payload);
    expect(outcome).toEqual({
      status: "sent",
      delivered: 0,
      removed: 2,
      failed: 1,
    });
    expect(repo.deleteSubscriptions).toHaveBeenCalledWith([
      target("a").endpoint,
      target("c").endpoint,
    ]);
  });

  it("un errore di rete non lancia e non elimina nulla", async () => {
    vi.mocked(webpush.default.sendNotification).mockRejectedValue(
      new Error("ECONNREFUSED"),
    );
    const outcome = await service.sendToClient(CLIENT, payload);
    expect(outcome).toMatchObject({ status: "sent", failed: 3 });
    expect(repo.deleteSubscriptions).not.toHaveBeenCalled();
  });

  it("nei log niente endpoint né contenuto", async () => {
    vi.mocked(webpush.default.sendNotification).mockRejectedValue(
      pushError(500),
    );
    await service.sendToClient(CLIENT, payload);
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).not.toContain("fcm.googleapis.com");
    expect(logged).not.toContain("Hai un nuovo documento");
  });

  it("nessun invio a un cliente disattivato o senza dispositivi", async () => {
    vi.mocked(repo.getClientPushTargets).mockResolvedValueOnce({
      accountStatus: "disabled",
      studioName: "Studio Verde",
      subscriptions: [target("a")],
    });
    expect(await service.sendToClient(CLIENT, payload)).toEqual({
      status: "skipped",
      reason: "inactive",
    });
    vi.mocked(repo.getClientPushTargets).mockResolvedValueOnce({
      accountStatus: "active",
      studioName: "Studio Verde",
      subscriptions: [],
    });
    expect(await service.sendToClient(CLIENT, payload)).toEqual({
      status: "skipped",
      reason: "no_devices",
    });
    expect(webpush.default.sendNotification).not.toHaveBeenCalled();
  });

  it("senza chiavi VAPID non invia", async () => {
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    expect(await service.sendToClient(CLIENT, payload)).toEqual({
      status: "skipped",
      reason: "not_configured",
    });
    expect(repo.getClientPushTargets).not.toHaveBeenCalled();
  });
});

describe("isExpiredSubscription", () => {
  it("solo 404 e 410", () => {
    expect(service.isExpiredSubscription(404)).toBe(true);
    expect(service.isExpiredSubscription(410)).toBe(true);
    expect(service.isExpiredSubscription(429)).toBe(false);
    expect(service.isExpiredSubscription(500)).toBe(false);
    expect(service.isExpiredSubscription(undefined)).toBe(false);
  });
});
