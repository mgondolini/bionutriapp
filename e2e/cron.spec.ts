import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { adminClient } from "./helpers";

/*
 * Manutenzione giornaliera (fase 9): senza il segreto il Route Handler
 * risponde 401 e non fa nulla; con il segreto elimina gli oggetti orfani più
 * vecchi di 24 ore (qui: nessuno di quelli appena creati) e risponde con i
 * soli conteggi.
 */

const URL = "/api/cron/manutenzione";

test("senza segreto o con un segreto errato: 401", async ({ request }) => {
  expect((await request.post(URL)).status()).toBe(401);
  expect(
    (
      await request.post(URL, {
        headers: { Authorization: "Bearer segreto-sbagliato" },
      })
    ).status(),
  ).toBe(401);
  // solo POST: GET non esiste
  expect((await request.get(URL)).status()).toBe(405);
});

test("con il segreto: completa la manutenzione e non tocca i caricamenti recenti", async ({
  request,
}) => {
  const secret = process.env.CRON_SECRET;
  test.skip(!secret, "CRON_SECRET non configurato");

  // oggetto caricato adesso e mai confermato: ha meno di 24 ore, resta
  const admin = adminClient();
  const { data: client } = await admin
    .from("clients")
    .select("id, studio_id")
    .limit(1)
    .single();
  const path = `${client!.studio_id}/${client!.id}/${randomUUID()}.pdf`;
  const { error } = await admin.storage
    .from("client-files")
    .upload(path, Buffer.from("%PDF-1.4 orfano"), {
      contentType: "application/pdf",
    });
  expect(error).toBeNull();

  try {
    const response = await request.post(URL, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, failed: [] });
    expect(Object.keys(body).sort()).toEqual([
      "durationMs",
      "expiredInvitesDeleted",
      "failed",
      "notificationLogDeleted",
      "ok",
      "orphanPhotosRemoved",
      "orphanUploadsRemoved",
      "videosChecked",
      "videosUnavailable",
    ]);

    const { data: still } = await admin.storage
      .from("client-files")
      .exists(path);
    expect(still).toBe(true);
  } finally {
    await admin.storage.from("client-files").remove([path]);
  }
});
