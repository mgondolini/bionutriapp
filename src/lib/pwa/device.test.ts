import { describe, expect, it } from "vitest";

import {
  detectDevice,
  installGuideKind,
  pushState,
  shouldAutoOpenInstallGuide,
  type DeviceInfo,
  type PushSupport,
} from "./device";

const UA = {
  iphoneSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  iphoneChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.119 Mobile/15E148 Safari/604.1",
  // PWA installata su iPhone: niente "Safari" nello user agent
  iphoneStandalone:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  // iPadOS si presenta come un Mac
  ipad: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
  macSafari:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15",
  androidChrome:
    "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Mobile Safari/537.36",
  androidSamsung:
    "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S921B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36",
  androidFirefox:
    "Mozilla/5.0 (Android 14; Mobile; rv:140.0) Gecko/140.0 Firefox/140.0",
  windowsChrome:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
  windowsEdge:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0",
};

const detect = (userAgent: string, maxTouchPoints = 0, standalone = false) =>
  detectDevice({ userAgent, maxTouchPoints, standalone });

describe("detectDevice", () => {
  it("riconosce iPhone con Safari e con Chrome", () => {
    expect(detect(UA.iphoneSafari, 5)).toEqual({
      platform: "ios",
      browser: "safari",
      installed: false,
    });
    expect(detect(UA.iphoneChrome, 5).browser).toBe("chrome");
  });

  it("riconosce la PWA installata su iPhone", () => {
    expect(detect(UA.iphoneStandalone, 5, true)).toMatchObject({
      platform: "ios",
      installed: true,
    });
  });

  it("riconosce l'iPad che si presenta come Mac (touch), non il Mac vero", () => {
    expect(detect(UA.ipad, 5).platform).toBe("ios");
    expect(detect(UA.macSafari, 0)).toEqual({
      platform: "desktop",
      browser: "safari",
      installed: false,
    });
  });

  it("riconosce Android con Chrome, Samsung Internet e Firefox", () => {
    expect(detect(UA.androidChrome, 5)).toEqual({
      platform: "android",
      browser: "chrome",
      installed: false,
    });
    expect(detect(UA.androidSamsung, 5).browser).toBe("samsung");
    expect(detect(UA.androidFirefox, 5).browser).toBe("firefox");
    expect(detect(UA.androidChrome, 5, true).installed).toBe(true);
  });

  it("riconosce il desktop", () => {
    expect(detect(UA.windowsChrome)).toEqual({
      platform: "desktop",
      browser: "chrome",
      installed: false,
    });
    expect(detect(UA.windowsEdge).browser).toBe("edge");
  });
});

describe("installGuideKind", () => {
  it("app già installata: nessuna guida", () => {
    expect(
      installGuideKind(detect(UA.iphoneStandalone, 5, true), {
        canPrompt: false,
      }),
    ).toBe("installed");
    expect(
      installGuideKind(detect(UA.androidChrome, 5, true), { canPrompt: true }),
    ).toBe("installed");
  });

  it("iPhone: i passaggi di Safari, oppure aprire Safari", () => {
    expect(
      installGuideKind(detect(UA.iphoneSafari, 5), { canPrompt: false }),
    ).toBe("ios-safari");
    expect(
      installGuideKind(detect(UA.iphoneChrome, 5), { canPrompt: false }),
    ).toBe("ios-other-browser");
  });

  it("Android: pulsante Installa se c'è beforeinstallprompt, altrimenti il menu", () => {
    const android = detect(UA.androidChrome, 5);
    expect(installGuideKind(android, { canPrompt: true })).toBe(
      "android-prompt",
    );
    expect(installGuideKind(android, { canPrompt: false })).toBe(
      "android-manual",
    );
  });
});

describe("shouldAutoOpenInstallGuide", () => {
  it("solo su telefono, non installata e mai chiusa", () => {
    expect(
      shouldAutoOpenInstallGuide(detect(UA.iphoneSafari, 5), {
        dismissed: false,
      }),
    ).toBe(true);
    expect(
      shouldAutoOpenInstallGuide(detect(UA.iphoneSafari, 5), {
        dismissed: true,
      }),
    ).toBe(false);
    expect(
      shouldAutoOpenInstallGuide(detect(UA.androidChrome, 5, true), {
        dismissed: false,
      }),
    ).toBe(false);
    expect(
      shouldAutoOpenInstallGuide(detect(UA.windowsChrome), {
        dismissed: false,
      }),
    ).toBe(false);
  });
});

describe("pushState", () => {
  const full: PushSupport = {
    serviceWorker: true,
    pushManager: true,
    notification: true,
  };
  const state = (
    device: DeviceInfo,
    overrides: Partial<Parameters<typeof pushState>[0]> = {},
  ) =>
    pushState({
      device,
      support: full,
      permission: "default",
      subscribed: false,
      ...overrides,
    });

  it("iPhone non installata: prima l'installazione, anche se il permesso c'è", () => {
    expect(state(detect(UA.iphoneSafari, 5))).toBe("needs-install");
    expect(
      state(detect(UA.iphoneSafari, 5), {
        permission: "granted",
        subscribed: true,
      }),
    ).toBe("needs-install");
  });

  it("iPhone installata: si può chiedere il permesso", () => {
    expect(state(detect(UA.iphoneStandalone, 5, true))).toBe("ask");
  });

  it("browser senza push: non supportato", () => {
    expect(
      state(detect(UA.androidFirefox, 5), {
        support: { ...full, pushManager: false },
      }),
    ).toBe("unsupported");
  });

  it("permesso negato: si spiega come riattivarlo", () => {
    expect(state(detect(UA.androidChrome, 5), { permission: "denied" })).toBe(
      "denied",
    );
  });

  it("attive solo con permesso e sottoscrizione registrata", () => {
    const android = detect(UA.androidChrome, 5);
    expect(state(android, { permission: "granted", subscribed: true })).toBe(
      "active",
    );
    expect(state(android, { permission: "granted", subscribed: false })).toBe(
      "ask",
    );
    expect(state(android, { permission: "default", subscribed: true })).toBe(
      "ask",
    );
  });
});
