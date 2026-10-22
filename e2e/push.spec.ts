import { createECDH, randomBytes } from "node:crypto";

import { expect, test, type Browser } from "@playwright/test";

import { samplePdf } from "../scripts/sample-pdf";
import {
  adminClient,
  cleanup,
  createActiveClient,
  login,
  OWNER,
} from "./helpers";

/*
 * Notifiche push (fase 8) in Chromium con il permesso concesso: il banner
 * compare, "Attiva" salva la sottoscrizione e il banner scompare;
 * l'interruttore del profilo la elimina e la ricrea; il logout la elimina.
 * La pubblicazione di un file riesce anche se l'invio della push fallisce.
 * Offline il service worker mostra solo la pagina offline, mai dati.
 *
 * Chromium senza interfaccia non può registrarsi al servizio push di Google
 * e riporta il permesso come negato: `PushManager` e `Notification.permission`
 * sono simulati (endpoint FCM finto, chiavi P-256 vere). Il resto (service
 * worker, Server Actions, database) è quello reale. L'invio vero lo verifica
 * la prova manuale (docs/checklist-dispositivi.md).
 */

const PASSWORD = "password-push-1";
const stamp = Date.now().toString(36);
const phones: string[] = [];

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  const admin = adminClient();
  const { data } = await admin
    .from("clients")
    .select("client_files(storage_path)")
    .in("phone", phones);
  const paths = (data ?? []).flatMap((row) =>
    (row.client_files as { storage_path: string }[]).map((f) => f.storage_path),
  );
  if (paths.length > 0) await admin.storage.from("client-files").remove(paths);
  await cleanup(phones);
});

/** Sottoscrizione finta ma ben formata, come la darebbe il browser. */
function fakeSubscription(id: string) {
  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  return {
    endpoint: `https://fcm.googleapis.com/fcm/send/e2e-${id}`,
    keys: {
      p256dh: ecdh.getPublicKey().toString("base64url"),
      auth: randomBytes(16).toString("base64url"),
    },
  };
}

type FakeSubscription = ReturnType<typeof fakeSubscription>;

/** Dispositivo con il permesso delle notifiche e PushManager simulato. */
async function pushDevice(browser: Browser, subscription: FakeSubscription) {
  const context = await browser.newContext({
    locale: "it-IT",
    permissions: ["notifications"],
  });
  await context.addInitScript((data) => {
    const KEY = "__e2ePushSubscription";
    const read = () => {
      try {
        return JSON.parse(localStorage.getItem(KEY) ?? "null");
      } catch {
        return null;
      }
    };
    const wrap = (value: typeof data | null) =>
      value && {
        endpoint: value.endpoint,
        expirationTime: null,
        options: { applicationServerKey: null, userVisibleOnly: true },
        toJSON: () => ({ ...value, expirationTime: null }),
        unsubscribe: async () => {
          localStorage.removeItem(KEY);
          return true;
        },
      };
    // Chromium senza interfaccia risponde "denied" anche con il permesso
    // concesso al contesto: si simula la risposta di un browser normale.
    Object.defineProperty(Notification, "permission", {
      get: () => "granted",
    });
    Notification.requestPermission = async () => "granted";
    PushManager.prototype.getSubscription = async function () {
      return wrap(read()) as unknown as PushSubscription;
    };
    PushManager.prototype.subscribe = async function () {
      localStorage.setItem(KEY, JSON.stringify(data));
      return wrap(data) as unknown as PushSubscription;
    };
  }, subscription);
  return { context, page: await context.newPage() };
}

async function subscriptionsOf(userId: string) {
  const { data, error } = await adminClient()
    .from("push_subscriptions")
    .select("endpoint")
    .eq("user_id", userId);
  if (error) throw error;
  return data.map((row) => row.endpoint);
}

async function pushEnabled(clientId: string) {
  const { data } = await adminClient()
    .from("clients")
    .select("push_enabled")
    .eq("id", clientId)
    .single();
  return data?.push_enabled ?? null;
}

test("Attiva salva la sottoscrizione, il banner scompare, il profilo la gestisce, il logout la elimina", async ({
  browser,
}) => {
  const client = await createActiveClient({
    firstName: "Pia",
    lastName: "Push",
    password: PASSWORD,
    email: `push.${stamp}@example.test`,
  });
  phones.push(client.phone.e164);
  const subscription = fakeSubscription(stamp);
  const { context, page } = await pushDevice(browser, subscription);

  await login(page, client.phone.typed, PASSWORD);
  await expect(page).toHaveURL(/\/app$/);

  // Banner C5: su desktop la guida all'installazione non si apre da sola
  const banner = page.getByRole("region", { name: "Attiva le notifiche" });
  await expect(banner).toBeVisible();
  await expect(banner).toContainText(
    "Ti avvisiamo quando arriva un nuovo file.",
  );
  expect(await subscriptionsOf(client.userId)).toEqual([]);
  expect(await pushEnabled(client.clientId)).toBe(false);

  await banner.getByRole("button", { name: "Attiva" }).click();
  await expect(page.getByText("Notifiche attivate.")).toBeVisible();
  await expect(banner).toBeHidden();
  expect(await subscriptionsOf(client.userId)).toEqual([subscription.endpoint]);
  expect(await pushEnabled(client.clientId)).toBe(true);

  // Il service worker dell'area cliente è registrato con scope /app
  const scope = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration("/app");
    return registration ? new URL(registration.scope).pathname : null;
  });
  expect(scope).toBe("/app");

  // Dopo un ricaricamento resta attiva: nessun banner
  await page.reload();
  await expect(page.getByText("Ciao Pia")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Attiva le notifiche" }),
  ).toHaveCount(0);

  // Profilo: interruttore acceso; spento elimina, riacceso ricrea
  await page.goto("/app/profilo");
  const toggle = page.getByRole("switch", { name: "Avvisi sul telefono" });
  await expect(toggle).toBeChecked();
  await toggle.click();
  await expect(page.getByText("Notifiche disattivate.")).toBeVisible();
  await expect(toggle).not.toBeChecked();
  await expect.poll(() => subscriptionsOf(client.userId)).toEqual([]);
  expect(await pushEnabled(client.clientId)).toBe(false);
  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect
    .poll(() => subscriptionsOf(client.userId))
    .toEqual([subscription.endpoint]);
  expect(await pushEnabled(client.clientId)).toBe(true);

  // Logout: sottoscrizione eliminata sul server e annullata nel browser
  await page.getByRole("button", { name: "Esci", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?motivo=uscito$/);
  await expect.poll(() => subscriptionsOf(client.userId)).toEqual([]);
  expect(await pushEnabled(client.clientId)).toBe(false);
  expect(
    await page.evaluate(() => localStorage.getItem("__e2ePushSubscription")),
  ).toBeNull();
  await context.close();
});

test("la pubblicazione riesce anche se l'invio della push fallisce", async ({
  page,
}) => {
  const client = await createActiveClient({
    firstName: "Fede",
    lastName: "Fallita",
    password: PASSWORD,
    email: null,
  });
  phones.push(client.phone.e164);

  // Un dispositivo che non risponde (inserito direttamente: lo schema delle
  // Server Actions accetta solo i servizi push noti)
  const broken = fakeSubscription(`${stamp}-rotto`);
  const endpoint = "https://127.0.0.1:9/push/e2e";
  const { error } = await adminClient().from("push_subscriptions").insert({
    user_id: client.userId,
    endpoint,
    p256dh: broken.keys.p256dh,
    auth: broken.keys.auth,
  });
  expect(error).toBeNull();
  expect(await pushEnabled(client.clientId)).toBe(true);

  const title = `Piano push ${stamp}`;
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await page.goto(`/admin/clienti/${client.clientId}/file`);
  const publish = page.getByRole("button", { name: "Pubblica file" });
  await expect(publish).toBeEnabled();
  await page.locator('input[type="file"]').setInputFiles({
    name: "piano.pdf",
    mimeType: "application/pdf",
    buffer: samplePdf(title, 50_000),
  });
  await page.getByRole("radio", { name: "Dieta" }).check();
  await page.getByLabel("Titolo visibile al cliente").fill(title);
  await expect(
    page.getByRole("checkbox", { name: /Avvisa il cliente/ }),
  ).toBeChecked();
  await publish.click();
  await expect(page.getByText(`"${title}" pubblicato.`)).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole("row").filter({ hasText: title })).toBeVisible();

  // Errore di rete (non 404/410): la sottoscrizione resta
  const { count } = await adminClient()
    .from("client_files")
    .select("id", { count: "exact", head: true })
    .eq("client_id", client.clientId);
  expect(count).toBe(1);
  expect(await subscriptionsOf(client.userId)).toEqual([endpoint]);
});

test("offline il service worker mostra solo la pagina offline, mai dati", async ({
  browser,
}) => {
  const client = await createActiveClient({
    firstName: "Olga",
    lastName: "Offline",
    password: PASSWORD,
    email: null,
  });
  phones.push(client.phone.e164);
  const { context, page } = await pushDevice(
    browser,
    fakeSubscription(`${stamp}-off`),
  );

  await login(page, client.phone.typed, PASSWORD);
  await expect(page.getByText("Ciao Olga")).toBeVisible();
  await page.goto("/app/profilo");
  await expect(
    page.getByRole("heading", { name: "Olga Offline", level: 1 }),
  ).toBeVisible();
  // Service worker attivo, poi una pagina caricata da zero: è controllata
  // (come all'apertura dell'app installata)
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (await navigator.serviceWorker.getRegistration("/app"))?.active
            ?.state ?? null,
      ),
    )
    .toBe("activated");
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);

  await context.setOffline(true);
  for (const path of ["/app", "/app/profilo"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Sei offline" }),
    ).toBeVisible();
    await expect(page.getByText("Olga")).toHaveCount(0);
  }
  await context.setOffline(false);
  await page.goto("/app");
  await expect(page.getByText("Ciao Olga")).toBeVisible();
  await context.close();
});
