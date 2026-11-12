/*
 * Service worker dell'area cliente (fase 8), registrato con scope "/app".
 *
 * REGOLA (fase 7): nessuna cache di pagine, risposte RSC, dati delle aree
 * autenticate o Server Actions. L'unica cosa in cache è la pagina offline
 * statica, senza dati. Le navigazioni vanno sempre in rete; solo se la rete
 * manca compare la pagina offline.
 *
 * Cambiare VERSION a ogni modifica di questo file o di offline.html.
 */

const VERSION = "v7";
const CACHE = `offline-${VERSION}`;
const OFFLINE_URL = "/offline.html";
const DEFAULT_URL = "/app";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.add(new Request(OFFLINE_URL, { cache: "reload" })))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  // Solo le navigazioni: tutto il resto (asset, RSC, Server Actions) passa
  // dalla rete senza che il service worker intervenga.
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(async () => {
      const offline = await caches.match(OFFLINE_URL);
      return offline ?? Response.error();
    }),
  );
});

/**
 * Solo percorsi relativi di questo sito ("/app/…"): un url assoluto o
 * "//host" nel payload viene ignorato e il tocco apre /app.
 */
function safeUrl(value) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }
  try {
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin ? url.href : null;
  } catch {
    return null;
  }
}

/*
 * Badge monocromatico per tipo (Android; iOS lo ignora e mostra l'icona della
 * PWA, non è un errore). Stessi tipi di NOTIFICATION_TYPES in domain.ts.
 */
const BADGE_TYPES = ["file_diet", "file_workout", "file_report", "daily_checkin", "video", "measure_check"];
function badgeFor(type) {
  return BADGE_TYPES.includes(type) ? `/notification-badges/${type}.png` : undefined;
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  // Su iPhone ogni push DEVE mostrare una notifica: anche senza dati validi.
  const title = typeof data.title === "string" ? data.title : "";
  const options = {
    body: typeof data.body === "string" ? data.body : "",
    icon: safeUrl(data.icon) ?? undefined,
    badge: badgeFor(data.type),
    tag: typeof data.tag === "string" ? data.tag : undefined,
    renotify: typeof data.tag === "string",
    data: {
      url: safeUrl(data.url) ?? new URL(DEFAULT_URL, self.location.origin).href,
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target =
    safeUrl(event.notification.data && event.notification.data.url) ??
    new URL(DEFAULT_URL, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      // Una finestra dell'app già aperta: in primo piano e ricaricata sulla
      // pagina giusta, anche se è già lì (altrimenti il nuovo file non compare)
      const existing = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (existing) {
        const focused = await existing.focus();
        if ("navigate" in focused) {
          try {
            await focused.navigate(target);
          } catch {
            // finestra non controllata (aperta fuori da /app): una nuova
            await self.clients.openWindow(target);
          }
        }
        return;
      }
      await self.clients.openWindow(target);
    })(),
  );
});
