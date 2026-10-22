import { describe, expect, it } from "vitest";

import { isAllowedPushEndpoint, pushSubscriptionSchema } from "./push.schema";

const keys = {
  p256dh:
    "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM",
  auth: "tBHItJI5svbpez7KI4CCXg",
};

describe("isAllowedPushEndpoint", () => {
  it("accetta i servizi push noti", () => {
    for (const endpoint of [
      "https://fcm.googleapis.com/fcm/send/abc:def",
      "https://web.push.apple.com/QGuQyavXutnMei",
      "https://updates.push.services.mozilla.com/wpush/v2/gAAA",
      "https://wns2-db5p.notify.windows.com/w/?token=x",
    ]) {
      expect(isAllowedPushEndpoint(endpoint), endpoint).toBe(true);
    }
  });

  it("rifiuta indirizzi qualunque, http, porte e host che imitano quelli noti", () => {
    for (const endpoint of [
      "http://fcm.googleapis.com/fcm/send/abc",
      "https://127.0.0.1/push",
      "https://localhost:3000/push",
      "https://fcm.googleapis.com:8443/fcm/send/abc",
      "https://fcm.googleapis.com.evil.example/x",
      "https://evilfcm.googleapis.com.example/x",
      "https://user@fcm.googleapis.com/x",
      "non è un url",
    ]) {
      expect(isAllowedPushEndpoint(endpoint), endpoint).toBe(false);
    }
  });
});

describe("pushSubscriptionSchema", () => {
  it("accetta una sottoscrizione del browser e tronca lo user agent", () => {
    const parsed = pushSubscriptionSchema.parse({
      endpoint: "https://fcm.googleapis.com/fcm/send/abc",
      keys,
      userAgent: "x".repeat(1000),
    });
    expect(parsed.userAgent).toHaveLength(256);
  });

  it("rifiuta chiavi non valide o un endpoint non consentito", () => {
    expect(
      pushSubscriptionSchema.safeParse({
        endpoint: "https://fcm.googleapis.com/fcm/send/abc",
        keys: { ...keys, p256dh: "<script>" },
      }).success,
    ).toBe(false);
    expect(
      pushSubscriptionSchema.safeParse({
        endpoint: "https://example.com/push",
        keys,
      }).success,
    ).toBe(false);
  });
});
