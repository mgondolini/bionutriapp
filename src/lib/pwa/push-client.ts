import {
  SERVICE_WORKER_SCOPE,
  SERVICE_WORKER_URL,
} from "@/lib/constants/domain";

import {
  detectDevice,
  type DeviceInfo,
  type PushPermission,
  type PushSupport,
} from "./device";

/*
 * Service worker e sottoscrizione Web Push nel browser (fase 8). Solo API
 * del browser: le decisioni stanno nelle funzioni pure di `device.ts`, il
 * salvataggio nelle Server Actions di `push.actions.ts`.
 */

/** Dati del dispositivo letti dal browser. */
export function readDevice(): DeviceInfo {
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return detectDevice({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    standalone,
  });
}

export function readPushSupport(): PushSupport {
  return {
    serviceWorker: "serviceWorker" in navigator,
    pushManager: "PushManager" in window,
    notification: "Notification" in window,
  };
}

export function readPermission(): PushPermission {
  return "Notification" in window ? Notification.permission : "default";
}

function register(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register(SERVICE_WORKER_URL, {
    scope: SERVICE_WORKER_SCOPE,
    updateViaCache: "none",
  });
}

/** Registra il service worker dell'area cliente (idempotente). */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  register().catch((error: unknown) => {
    console.error("Registrazione del service worker non riuscita", error);
  });
}

/**
 * Registrazione con il service worker attivo. Non si usa
 * `navigator.serviceWorker.ready`: dopo il login la pagina nasce su /login
 * (fuori dallo scope /app) e arriva in /app con una navigazione interna,
 * quindi `ready` non si risolverebbe mai. Si aspetta l'attivazione sulla
 * registrazione stessa.
 */
async function activeRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  const registration =
    (await navigator.serviceWorker.getRegistration(SERVICE_WORKER_SCOPE)) ??
    (await register());
  if (registration.active) return registration;
  const worker = registration.installing ?? registration.waiting;
  if (!worker) return null;
  await new Promise<void>((resolve, reject) => {
    worker.addEventListener("statechange", () => {
      if (worker.state === "activated") resolve();
      if (worker.state === "redundant") reject(new Error("service worker"));
    });
  });
  return registration;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator)) return null;
  const registration =
    await navigator.serviceWorker.getRegistration(SERVICE_WORKER_SCOPE);
  return (await registration?.pushManager?.getSubscription()) ?? null;
}

/**
 * Endpoint della sottoscrizione di questo browser, se esiste. L'uscita lo
 * invia al server, che elimina la sottoscrizione (fase 7).
 */
export async function currentPushEndpoint(): Promise<string | null> {
  try {
    return (await currentSubscription())?.endpoint ?? null;
  } catch {
    return null;
  }
}

function vapidPublicKey(): Uint8Array<ArrayBuffer> {
  const base64 = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return true; // il browser non la espone: non si può confrontare
  const left = new Uint8Array(a);
  return left.length === b.length && left.every((value, i) => value === b[i]);
}

/**
 * Sottoscrizione di questo browser, solo se il server la conosce per
 * l'utente corrente. Una sottoscrizione che il server non ha (rimasta da
 * un'uscita da tutti i dispositivi, di un altro utente dello stesso
 * telefono, o con una chiave VAPID cambiata) viene annullata: così il banner
 * ricompare e nessuno riceve le notifiche di qualcun altro.
 */
export async function readRegisteredSubscription(
  registeredEndpoints: readonly string[],
): Promise<PushSubscription | null> {
  const subscription = await currentSubscription();
  if (!subscription) return null;
  const known = registeredEndpoints.includes(subscription.endpoint);
  if (
    known &&
    sameKey(subscription.options.applicationServerKey, vapidPublicKey())
  ) {
    return subscription;
  }
  await subscription.unsubscribe().catch(() => false);
  return null;
}

export type SubscribeOutcome =
  | { ok: true; subscription: PushSubscriptionJSON }
  | { ok: false; reason: "denied" | "failed" };

/**
 * Chiede il permesso e crea la sottoscrizione. Va chiamata DIRETTAMENTE dal
 * tocco su "Attiva" (su iPhone il permesso si chiede solo così): la
 * richiesta del permesso è la prima cosa che succede.
 */
export async function subscribeToPush(): Promise<SubscribeOutcome> {
  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch {
    return { ok: false, reason: "failed" };
  }
  if (permission !== "granted") return { ok: false, reason: "denied" };
  try {
    const registration = await activeRegistration();
    if (!registration) return { ok: false, reason: "failed" };
    const existing = await registration.pushManager.getSubscription();
    const key = vapidPublicKey();
    if (existing && !sameKey(existing.options.applicationServerKey, key)) {
      await existing.unsubscribe();
    }
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    });
    return { ok: true, subscription: subscription.toJSON() };
  } catch (error) {
    console.error("Sottoscrizione push non riuscita", error);
    return { ok: false, reason: "failed" };
  }
}

/** Annulla la sottoscrizione di questo browser; restituisce l'endpoint annullato. */
export async function unsubscribeFromPush(): Promise<string | null> {
  try {
    const subscription = await currentSubscription();
    if (!subscription) return null;
    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    return endpoint;
  } catch {
    return null;
  }
}
