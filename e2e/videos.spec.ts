import type { Server } from "node:http";

import { expect, test, type Page } from "@playwright/test";

import { startOembedServer } from "./fixtures/oembed";
import { OWNER, adminClient, login, newDevice } from "./helpers";

/*
 * Libreria video (mockup v4): cartella e sottocartella, aggiunta di un video
 * con la verifica del link (oEmbed finto, nessuna chiamata a YouTube), link
 * non incorporabile bloccato, ordine dei video e delle cartelle con le
 * frecce (salvato), e lato cliente cartella, player al tocco e "Aperto da".
 */

const ANNA = { email: "anna.rossi@example.test", password: "password123" };
const SUFFIX = String(Date.now()).slice(-6);
const FOLDER = `E2E cartella ${SUFFIX}`;
const SUBFOLDER = `E2E sotto ${SUFFIX}`;

let oembed: Server;

test.beforeAll(async () => {
  oembed = await startOembedServer();
});

test.afterAll(async () => {
  oembed?.close();
  const admin = adminClient();
  const { data: folders } = await admin
    .from("video_folders")
    .select("id, parent_id")
    .in("name", [FOLDER, SUBFOLDER]);
  const ids = (folders ?? []).map((folder) => folder.id);
  if (ids.length === 0) return;
  await admin.from("videos").delete().in("folder_id", ids);
  // prima le sottocartelle (la cartella superiore ha un vincolo restrict)
  await admin
    .from("video_folders")
    .delete()
    .in("id", ids)
    .not("parent_id", "is", null);
  await admin.from("video_folders").delete().in("id", ids);
});

async function addVideo(page: Page, link: string) {
  await page.getByRole("button", { name: "Aggiungi video" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Aggiungi un video" });
  await dialog.getByLabel("Link del video YouTube").fill(link);
  await dialog.getByRole("button", { name: "Verifica" }).click();
  return dialog;
}

function folderList(page: Page) {
  return page.getByRole("list", {
    name: "Cartelle, nell'ordine in cui le vedono i clienti",
  });
}

test("lo staff organizza la libreria e il cliente guarda il video", async ({
  page,
  browser,
}) => {
  await login(page, OWNER.email, OWNER.password);
  await page.waitForURL("**/admin/**");
  await page.goto("/admin/video");
  await expect(
    page.getByRole("heading", { level: 1, name: "Video" }),
  ).toBeVisible();
  await expect(folderList(page)).toContainText("Benvenuto nel percorso");

  // Cartella e sottocartella
  await page.getByRole("button", { name: "Nuova cartella" }).click();
  let dialog = page.getByRole("dialog", { name: "Nuova cartella" });
  await dialog.getByLabel("Nome della cartella").fill(FOLDER);
  await dialog.getByRole("button", { name: "Crea cartella" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: FOLDER }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Nuova sottocartella" }).click();
  dialog = page.getByRole("dialog", {
    name: `Nuova sottocartella in ${FOLDER}`,
  });
  await expect(dialog).toContainText(
    `La vedono gli stessi clienti della cartella ${FOLDER}.`,
  );
  await dialog.getByLabel("Nome della cartella").fill(SUBFOLDER);
  await dialog.getByRole("button", { name: "Crea cartella" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: SUBFOLDER }),
  ).toBeVisible();
  await expect(
    page.getByRole("list", { name: `Sottocartelle di ${FOLDER}` }),
  ).toContainText(SUBFOLDER);

  // Un video non incorporabile non si aggiunge
  dialog = await addVideo(page, "https://youtu.be/e2eNoEmbed1");
  await expect(dialog.getByRole("alert")).toContainText(
    "non ne permette la riproduzione",
  );
  await expect(
    dialog.getByRole("button", { name: "Aggiungi video" }),
  ).toBeDisabled();
  await dialog.getByRole("button", { name: "Annulla" }).click();

  // Due video validi: il titolo arriva da oEmbed, l'ultimo va in cima
  dialog = await addVideo(page, "https://www.youtube.com/watch?v=e2eVideo001");
  await expect(dialog).toContainText("Video trovato e riproducibile nell'app");
  await expect(dialog.getByLabel("Titolo visibile ai clienti")).toHaveValue(
    "Video di prova e2e",
  );
  await expect(dialog.getByLabel("Cartella", { exact: true })).toHaveValue(/.+/);
  await dialog.getByRole("button", { name: "Aggiungi video" }).click();
  await expect(dialog).toBeHidden();

  dialog = await addVideo(page, "youtu.be/e2eVideo002");
  await expect(dialog.getByLabel("Titolo visibile ai clienti")).toHaveValue(
    "Secondo video e2e",
  );
  await dialog.getByRole("button", { name: "Aggiungi video" }).click();
  await expect(dialog).toBeHidden();

  const videos = page.getByRole("list", { name: `Video di ${SUBFOLDER}` });
  await expect(videos.getByRole("listitem")).toHaveCount(2);
  await expect(videos.getByRole("listitem").first()).toContainText(
    "Secondo video e2e",
  );

  // Trascinamento da tastiera: il secondo video scende, l'ordine resta dopo
  // il ricaricamento
  await dragWithKeyboard(page, "Secondo video e2e", "ArrowDown");
  await expect(videos.getByRole("listitem").first()).toContainText(
    "Video di prova e2e",
  );
  await page.reload();
  await expect(videos.getByRole("listitem").first()).toContainText(
    "Video di prova e2e",
  );

  // La nuova cartella (ultima) sale di un posto
  const folders = folderList(page);
  const before = await folders.locator(":scope > li").count();
  await expect(folders.locator(":scope > li").last()).toContainText(FOLDER);
  await dragWithKeyboard(page, FOLDER, "ArrowUp");
  await expect(folders.locator(":scope > li").nth(before - 2)).toContainText(
    FOLDER,
  );
  await page.reload();
  await expect(folders.locator(":scope > li").nth(before - 2)).toContainText(
    FOLDER,
  );

  // Il cliente: cartella → sottocartella → video, player solo al tocco
  const anna = await newDevice(browser);
  await login(anna.page, ANNA.email, ANNA.password);
  await anna.page.waitForURL("**/app");
  await anna.page.goto("/app/video");
  await anna.page.getByRole("link", { name: new RegExp(FOLDER) }).click();
  // "Ultimo video" di /app/video riporta il nome della sottocartella:
  // si aspetta la pagina della cartella prima del clic successivo
  await expect(
    anna.page.getByRole("heading", { level: 1, name: FOLDER }),
  ).toBeVisible();
  await anna.page.getByRole("link", { name: new RegExp(SUBFOLDER) }).click();
  await expect(
    anna.page.getByRole("heading", { level: 1, name: SUBFOLDER }),
  ).toBeVisible();
  await expect(
    anna.page.getByRole("navigation", { name: "Filtra i video" }),
  ).toContainText("Da guardare · 2");
  await anna.page.getByRole("link", { name: /Video di prova e2e/ }).click();
  await expect(anna.page.locator("iframe")).toHaveCount(0);
  await anna.page
    .getByRole("button", { name: "Riproduci Video di prova e2e" })
    .click();
  await expect(anna.page.locator("iframe")).toHaveAttribute(
    "src",
    /^https:\/\/www\.youtube-nocookie\.com\/embed\/e2eVideo001\?/,
  );
  await anna.page.getByRole("link", { name: `Torna a ${SUBFOLDER}` }).click();
  await expect(
    anna.page.getByRole("navigation", { name: "Filtra i video" }),
  ).toContainText("Da guardare · 1");
  await expect(anna.page.getByRole("img", { name: "Già aperto" })).toHaveCount(
    1,
  );
  await anna.context.close();

  // Lo staff vede chi l'ha aperto
  await page.reload();
  const opened = videos
    .getByRole("listitem")
    .filter({ hasText: "Video di prova e2e" });
  await expect(opened).toContainText("1 cliente");
});

test("la cartella in Onboarding: la vede solo se è anche in Onboarding", async ({
  page,
}) => {
  // Marco (seed) è in Onboarding: vede il video di benvenuto, non le ricette
  await login(page, "333 000 0002", "password123");
  await page.waitForURL("**/app");
  await expect(
    page.getByRole("heading", { name: "Intanto guarda" }),
  ).toBeVisible();
  await expect(page.getByText("Come funziona il percorso")).toBeVisible();
  await page.goto("/app/video");
  await expect(
    page.getByRole("link", { name: /^Benvenuto nel percorso 1 video/ }),
  ).toBeVisible();
  await expect(page.getByText("Ricette veloci")).toHaveCount(0);
});

/** Maniglia di un elenco ordinabile: spazio, una freccia, spazio (dnd-kit). */
async function dragWithKeyboard(
  page: Page,
  name: string,
  key: "ArrowUp" | "ArrowDown",
) {
  const handle = page.getByRole("button", {
    name: `Trascina per spostare ${name}`,
  });
  await handle.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press(key);
  await page.keyboard.press("Space");
}
