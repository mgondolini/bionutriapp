import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Invio Web Push con repository e libreria simulati: tutti i dispositivi
 * dell'utente, sottoscrizioni scadute (404, 410) eliminate, altri errori
 * contati come fallimenti consecutivi, esito sent/partial/failed.
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
  listSubscriptionsOfUser: vi.fn(),
  deleteSubscriptions: vi.fn(async () => undefined),
  recordPushResults: vi.fn(async () => 0),
  registerOwnSubscription: vi.fn(async () => true),
  deleteOwnSubscription: vi.fn(async () => undefined),
  listOwnEndpoints: vi.fn(async () => []),
}));

const webpush = await import("web-push");
const repo = await import("@/server/repositories/push.repository");
const service = await import("./push.service");

const USER = "u1";
const target = (id: string) => ({
  endpoint: `https://fcm.googleapis.com/fcm/send/${id}`,
  p256dh: "p",
  auth: "a",
});
const payload = {
  type: "file_diet" as const,
  title: "Studio Verde",
  body: "È disponibile il tuo nuovo piano alimentare.",
  icon: "/icon/192",
  url: "/app/diete",
  tag: "files:file_diet",
};
const TTL = 24 * 60 * 60;
const pushError = (statusCode: number) =>
  new webpush.WebPushError("x", statusCode, {}, "", "");

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_VAPID_PUBLIC_KEY", "pub");
  vi.stubEnv("VAPID_PRIVATE_KEY", "priv");
  vi.stubEnv("VAPID_SUBJECT", "mailto:test@example.test");
  vi.mocked(repo.listSubscriptionsOfUser).mockResolvedValue([
    target("a"),
    target("b"),
    target("c"),
  ]);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("sendToUser", () => {
  it("invia a tutti i dispositivi con TTL e urgenza, e azzera i fallimenti", async () => {
    const outcome = await service.sendToUser(USER, payload, TTL);
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
    expect(JSON.parse(body as string)).toEqual(payload);
    expect(options).toMatchObject({
      TTL,
      urgency: "normal",
      vapidDetails: { publicKey: "pub", privateKey: "priv" },
    });
    expect(repo.recordPushResults).toHaveBeenCalledWith(
      [target("a").endpoint, target("b").endpoint, target("c").endpoint],
      [],
      5,
    );
  });

  it("404 e 410 eliminano la sottoscrizione; gli altri errori contano un fallimento: esito parziale", async () => {
    vi.mocked(webpush.default.sendNotification)
      .mockRejectedValueOnce(pushError(410))
      .mockRejectedValueOnce(pushError(500))
      .mockResolvedValueOnce({ statusCode: 201, body: "", headers: {} });
    vi.mocked(repo.recordPushResults).mockResolvedValueOnce(0);
    const outcome = await service.sendToUser(USER, payload, TTL);
    expect(outcome).toEqual({
      status: "partial",
      delivered: 1,
      removed: 1,
      failed: 2,
    });
    expect(repo.deleteSubscriptions).toHaveBeenCalledWith([
      target("a").endpoint,
    ]);
    expect(repo.recordPushResults).toHaveBeenCalledWith(
      [target("c").endpoint],
      [target("b").endpoint],
      5,
    );
  });

  it("404 su tutti i dispositivi: esito fallito, tutte eliminate", async () => {
    vi.mocked(webpush.default.sendNotification).mockRejectedValue(
      pushError(404),
    );
    expect(await service.sendToUser(USER, payload, TTL)).toEqual({
      status: "failed",
      delivered: 0,
      removed: 3,
      failed: 3,
    });
  });

  it("le sottoscrizioni eliminate per troppi fallimenti contano tra le rimosse", async () => {
    vi.mocked(webpush.default.sendNotification).mockRejectedValue(
      new Error("ECONNREFUSED"),
    );
    vi.mocked(repo.recordPushResults).mockResolvedValueOnce(2);
    const outcome = await service.sendToUser(USER, payload, TTL);
    expect(outcome).toMatchObject({ status: "failed", failed: 3, removed: 2 });
    expect(repo.deleteSubscriptions).toHaveBeenCalledWith([]);
  });

  it("nei log niente endpoint né contenuto", async () => {
    vi.mocked(webpush.default.sendNotification).mockRejectedValue(
      pushError(500),
    );
    await service.sendToUser(USER, payload, TTL);
    const logged = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(logged).not.toContain("fcm.googleapis.com");
    expect(logged).not.toContain("piano alimentare");
  });

  it("senza dispositivi o senza chiavi VAPID non invia", async () => {
    vi.mocked(repo.listSubscriptionsOfUser).mockResolvedValueOnce([]);
    expect(await service.sendToUser(USER, payload, TTL)).toEqual({
      status: "skipped",
      reason: "no_devices",
    });
    vi.stubEnv("VAPID_PRIVATE_KEY", "");
    expect(await service.sendToUser(USER, payload, TTL)).toEqual({
      status: "skipped",
      reason: "not_configured",
    });
    expect(webpush.default.sendNotification).not.toHaveBeenCalled();
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
