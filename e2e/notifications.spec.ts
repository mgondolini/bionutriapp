import {
  createDecipheriv,
  createECDH,
  createHmac,
  randomBytes,
} from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer, type Server } from "node:https";
import type { AddressInfo } from "node:net";

import { expect, test } from "@playwright/test";

import { samplePdf } from "../scripts/sample-pdf";
import {
  adminClient,
  cleanup,
  createActiveClient,
  login,
  OWNER,
} from "./helpers";

/*
 * Avviso di un nuovo file (N-06) dall'inizio alla fine, senza simulare
 * web-push: il dispositivo della cliente punta a un "servizio push" locale
 * che riceve la richiesta vera del server. Il test conosce le chiavi del
 * dispositivo e decifra il messaggio (RFC 8291, aes128gcm) come farebbe il
 * browser: link alla categoria, nome dello studio, nessun dato del file.
 * Il server Next deve accettare il certificato del servizio finto
 * (NODE_EXTRA_CA_CERTS, impostata da playwright.config.ts per `pnpm dev`) e
 * raggiungere 127.0.0.1: su un'anteprima remota il test viene saltato.
 * Poi il cron del promemoria: senza segreto 401, con il segreto risponde e
 * una seconda chiamata nella stessa ora non crea nulla di nuovo.
 */

const PASSWORD = "password-notifiche-1";
const stamp = Date.now().toString(36);
const phones: string[] = [];
const received: Buffer[] = [];
let server: Server;
let pushUrl = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  // web-push invia solo in HTTPS: certificato di test accettato dal server
  // Next tramite NODE_EXTRA_CA_CERTS (vedi e2e/fixtures/push-service)
  const tls = {
    key: readFileSync("e2e/fixtures/push-service/key.pem"),
    cert: readFileSync("e2e/fixtures/push-service/cert.pem"),
  };
  server = createServer(tls, (request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      received.push(Buffer.concat(chunks));
      response.writeHead(201).end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  pushUrl = `https://127.0.0.1:${(server.address() as AddressInfo).port}/push`;
});

test.afterAll(async () => {
  server?.close();
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

const hmac = (key: Buffer, data: Buffer) =>
  createHmac("sha256", key).update(data).digest();

/** Decifra un messaggio Web Push aes128gcm con le chiavi del dispositivo. */
function decryptPush(
  body: Buffer,
  device: { ecdh: ReturnType<typeof createECDH>; auth: Buffer },
): string {
  const salt = body.subarray(0, 16);
  const idLength = body[20];
  const serverKey = body.subarray(21, 21 + idLength);
  const ciphertext = body.subarray(21 + idLength);

  const secret = device.ecdh.computeSecret(serverKey);
  const prkKey = hmac(device.auth, secret);
  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info\0"),
    device.ecdh.getPublicKey(),
    serverKey,
    Buffer.from([1]),
  ]);
  const ikm = hmac(prkKey, keyInfo);
  const prk = hmac(salt, ikm);
  const cek = hmac(
    prk,
    Buffer.from("Content-Encoding: aes128gcm\0\x01", "binary"),
  ).subarray(0, 16);
  const nonce = hmac(
    prk,
    Buffer.from("Content-Encoding: nonce\0\x01", "binary"),
  ).subarray(0, 12);

  const decipher = createDecipheriv("aes-128-gcm", cek, nonce);
  decipher.setAuthTag(ciphertext.subarray(ciphertext.length - 16));
  const padded = Buffer.concat([
    decipher.update(ciphertext.subarray(0, ciphertext.length - 16)),
    decipher.final(),
  ]);
  // ultimo record: testo, delimitatore 0x02, eventuali zeri di riempimento
  const end = padded.lastIndexOf(2);
  return padded.subarray(0, end).toString("utf8");
}

test("pubblico un file: la cliente riceve la push con il link della categoria", async ({
  page,
  baseURL,
}) => {
  test.skip(
    !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseURL ?? ""),
    "il server dell'anteprima non raggiunge il servizio push locale",
  );
  const client = await createActiveClient({
    firstName: "Nora",
    lastName: "Notifica",
    password: PASSWORD,
    email: null,
  });
  phones.push(client.phone.e164);

  const ecdh = createECDH("prime256v1");
  ecdh.generateKeys();
  const auth = randomBytes(16);
  const endpoint = `${pushUrl}/${stamp}`;
  // inserito direttamente: lo schema delle Server Actions accetta solo i
  // servizi push noti, non un server locale
  const { error } = await adminClient()
    .from("push_subscriptions")
    .insert({
      user_id: client.userId,
      endpoint,
      p256dh: ecdh.getPublicKey().toString("base64url"),
      auth: auth.toString("base64url"),
    });
  expect(error).toBeNull();

  const title = `Scheda segreta ${stamp}`;
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await page.goto(`/admin/clienti/${client.clientId}/file`);
  const publish = page.getByRole("button", { name: "Pubblica file" });
  await expect(publish).toBeEnabled();
  await page.locator('input[type="file"]').setInputFiles({
    name: "scheda.pdf",
    mimeType: "application/pdf",
    buffer: samplePdf(title, 20_000),
  });
  // l'input è sr-only: si sceglie dall'etichetta, come con il dito
  await page
    .locator("label")
    .filter({ hasText: /^Allenamento$/ })
    .click();
  await expect(page.getByRole("radio", { name: "Allenamento" })).toBeChecked();
  await page.getByLabel("Titolo visibile al cliente").fill(title);
  await page
    .getByLabel("Nota per il cliente (facoltativa)")
    .fill("Nota privata del nutrizionista");
  await publish.click();
  await expect(page.getByText(`"${title}" pubblicato.`)).toBeVisible({
    timeout: 60_000,
  });

  await expect.poll(() => received.length, { timeout: 15_000 }).toBe(1);
  const text = decryptPush(received[0], { ecdh, auth });
  const message = JSON.parse(text);
  expect(message).toEqual({
    type: "file_workout",
    title: expect.any(String),
    body: "È disponibile la tua nuova scheda di allenamento.",
    icon: "/icon/192",
    url: "/app/allenamenti",
    tag: "files:file_workout",
  });
  expect(text).not.toContain("segreta");
  expect(text).not.toContain("Nota privata");

  // registro: inviato, con il solo riferimento al file
  const { data: file } = await adminClient()
    .from("client_files")
    .select("id")
    .eq("client_id", client.clientId)
    .single();
  await expect
    .poll(async () => {
      const { data } = await adminClient()
        .from("notification_log")
        .select("status, dedupe_key, payload")
        .eq("client_id", client.clientId)
        .single();
      return data;
    })
    .toEqual({
      status: "sent",
      dedupe_key: `file:${file!.id}`,
      payload: {
        url: "/app/allenamenti",
        tag: "files:file_workout",
        fileId: file!.id,
      },
    });
  const { data: subscription } = await adminClient()
    .from("push_subscriptions")
    .select("failure_count, last_success_at")
    .eq("endpoint", endpoint)
    .single();
  expect(subscription?.failure_count).toBe(0);
  expect(subscription?.last_success_at).not.toBeNull();
});

test("il cron del promemoria: 401 senza segreto, idempotente con il segreto", async ({
  request,
}) => {
  const path = "/api/internal/notifications/daily-checkin";
  expect((await request.post(path)).status()).toBe(401);
  expect(
    (
      await request.post(path, {
        headers: { Authorization: "Bearer segreto-sbagliato" },
      })
    ).status(),
  ).toBe(401);

  const headers = { Authorization: `Bearer ${process.env.CRON_SECRET}` };
  const first = await request.post(path, { headers });
  expect(first.status()).toBe(200);
  const second = await request.post(path, { headers });
  expect(second.status()).toBe(200);
  // fuori dalle 20 nessuno studio è coinvolto; alle 20 la seconda
  // esecuzione trova solo duplicati
  expect(await second.json()).toMatchObject({ ok: true, queued: 0 });
});
