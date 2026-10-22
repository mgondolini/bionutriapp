/*
 * Riconoscimento del dispositivo e stato delle notifiche push (funzioni
 * pure, DEV-10). Il browser raccoglie i dati grezzi (user agent, touch,
 * display-mode, permesso); qui si decide cosa mostrare.
 *
 * Su iPhone e iPad le push funzionano solo con la PWA installata nella
 * schermata Home (iOS 16.4 e successivi, N-04).
 */

export type DevicePlatform = "ios" | "android" | "desktop";
export type DeviceBrowser =
  "safari" | "chrome" | "firefox" | "edge" | "samsung" | "other";

export type DeviceInfo = {
  platform: DevicePlatform;
  browser: DeviceBrowser;
  /** Aperta dall'icona della schermata Home (display-mode standalone). */
  installed: boolean;
};

export type DeviceSignals = {
  userAgent: string;
  /** `navigator.maxTouchPoints`: iPadOS si presenta come un Mac, ma touch. */
  maxTouchPoints: number;
  /** `display-mode: standalone` oppure `navigator.standalone` (iOS). */
  standalone: boolean;
};

function detectPlatform(ua: string, maxTouchPoints: number): DevicePlatform {
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  if (/Macintosh/i.test(ua) && maxTouchPoints > 1) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "desktop";
}

function detectBrowser(ua: string, platform: DevicePlatform): DeviceBrowser {
  if (platform === "ios") {
    // su iOS ogni browser usa WebKit; il nome compare con un suffisso proprio
    if (/CriOS/i.test(ua)) return "chrome";
    if (/FxiOS/i.test(ua)) return "firefox";
    if (/EdgiOS/i.test(ua)) return "edge";
    if (/Safari/i.test(ua)) return "safari";
    return "other";
  }
  if (/SamsungBrowser/i.test(ua)) return "samsung";
  if (/Edg(e|A)?\//i.test(ua)) return "edge";
  if (/Firefox/i.test(ua)) return "firefox";
  if (/Chrome|Chromium/i.test(ua)) return "chrome";
  if (/Safari/i.test(ua)) return "safari";
  return "other";
}

export function detectDevice(signals: DeviceSignals): DeviceInfo {
  const platform = detectPlatform(signals.userAgent, signals.maxTouchPoints);
  return {
    platform,
    browser: detectBrowser(signals.userAgent, platform),
    installed: signals.standalone,
  };
}

/** Telefono o tablet: la guida all'installazione si propone solo qui. */
export function isMobile(device: DeviceInfo): boolean {
  return device.platform !== "desktop";
}

/** Contenuto della guida all'installazione (C-06, C3). */
export type InstallGuideKind =
  | "installed"
  | "ios-safari"
  | "ios-other-browser"
  | "android-prompt"
  | "android-manual"
  | "desktop-prompt"
  | "desktop-manual";

export function installGuideKind(
  device: DeviceInfo,
  options: { canPrompt: boolean },
): InstallGuideKind {
  if (device.installed) return "installed";
  if (device.platform === "ios") {
    // "Aggiungi alla schermata Home" è affidabile solo da Safari
    return device.browser === "safari" ? "ios-safari" : "ios-other-browser";
  }
  if (device.platform === "android") {
    return options.canPrompt ? "android-prompt" : "android-manual";
  }
  return options.canPrompt ? "desktop-prompt" : "desktop-manual";
}

/** La guida si apre da sola al primo accesso: solo su telefono, non installata, mai chiusa. */
export function shouldAutoOpenInstallGuide(
  device: DeviceInfo,
  options: { dismissed: boolean },
): boolean {
  return isMobile(device) && !device.installed && !options.dismissed;
}

export type PushSupport = {
  serviceWorker: boolean;
  pushManager: boolean;
  notification: boolean;
};

export type PushPermission = "default" | "granted" | "denied";

/**
 * Stato delle notifiche su questo dispositivo:
 * - `needs-install`: iPhone/iPad senza PWA installata (prima la guida);
 * - `unsupported`: il browser non gestisce le push;
 * - `denied`: permesso negato, si riattiva solo dalle impostazioni;
 * - `active`: sottoscrizione presente e registrata sul server;
 * - `ask`: si può chiedere il permesso con un tocco su "Attiva".
 */
export type PushState =
  "needs-install" | "unsupported" | "denied" | "active" | "ask";

export function pushState(input: {
  device: DeviceInfo;
  support: PushSupport;
  permission: PushPermission;
  subscribed: boolean;
}): PushState {
  const { device, support, permission, subscribed } = input;
  if (device.platform === "ios" && !device.installed) return "needs-install";
  if (!support.serviceWorker || !support.pushManager || !support.notification) {
    return "unsupported";
  }
  if (permission === "denied") return "denied";
  if (permission === "granted" && subscribed) return "active";
  return "ask";
}
