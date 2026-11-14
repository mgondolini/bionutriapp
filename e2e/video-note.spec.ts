import type { Server } from "node:http";

import { expect, test } from "@playwright/test";

import { adminVideoFolderUrl } from "../src/lib/constants/domain";

import { startOembedServer } from "./fixtures/oembed";
import { OWNER, adminClient, login, newDevice } from "./helpers";

/*
 * Nota dei video formattata (canvas "Nota video con editor": A14, A14b,
 * C15, C16): lo staff scrive la nota con lo stesso editor delle note
 * cliniche (grassetto, elenco) e un link (indirizzo javascript: rifiutato,
 * https:// aggiunto da solo); il cliente la vede formattata sotto il video,
 * con il link che si apre in una nuova scheda, e in anteprima di due righe
 * nell'elenco della cartella. Una nota oltre i 1000 caratteri non si salva.
 */

const ANNA = { email: "anna.rossi@example.test", password: "password123" };
const FOLDER = `E2E nota ${String(Date.now()).slice(-6)}`;

let oembed: Server;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  oembed = await startOembedServer();
});

test.afterAll(async () => {
  oembed?.close();
  const admin = adminClient();
  const { data: folders } = await admin
    .from("video_folders")
    .select("id")
    .eq("name", FOLDER);
  const ids = (folders ?? []).map((folder) => folder.id);
  if (ids.length === 0) return;
  await admin.from("videos").delete().in("folder_id", ids);
  await admin.from("video_folders").delete().in("id", ids);
});

test("lo staff scrive una nota con grassetto, elenco e link e il cliente la vede formattata", async ({
  page,
  browser,
}) => {
  await login(page, OWNER.email, OWNER.password);
  await page.waitForURL("**/admin/**");
  await page.goto("/admin/video");
  await page.getByRole("button", { name: "Nuova cartella" }).click();
  let dialog = page.getByRole("dialog", { name: "Nuova cartella" });
  await dialog.getByLabel("Nome della cartella").fill(FOLDER);
  await dialog.getByRole("button", { name: "Crea cartella" }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: FOLDER }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Aggiungi video" }).first().click();
  dialog = page.getByRole("dialog", { name: "Aggiungi un video" });
  await dialog
    .getByLabel("Link del video YouTube")
    .fill("https://www.youtube.com/watch?v=e2eVideo001");
  await dialog.getByRole("button", { name: "Verifica" }).click();
  await expect(dialog.getByLabel("Titolo visibile ai clienti")).toHaveValue(
    "Video di prova e2e",
  );

  // Editor: stessi comandi delle note cliniche più "Inserisci link"
  const note = dialog.getByRole("textbox", { name: "Nota per i clienti" });
  await expect(
    dialog.getByText(
      "Un consiglio, una variante o un link utile per i clienti",
    ),
  ).toBeVisible();
  await note.click();
  await page.keyboard.press("ControlOrMeta+b");
  await page.keyboard.type("Se non hai lo yogurt greco");
  await page.keyboard.press("ControlOrMeta+b");
  await page.keyboard.type(
    " va benissimo lo skyr: stesse proteine, meno grassi.",
  );
  await page.keyboard.press("Enter");
  await dialog.getByRole("button", { name: "Elenco puntato" }).click();
  await page.keyboard.type("170 g di skyr bianco");
  await page.keyboard.press("Enter");
  await page.keyboard.type("30 g di fiocchi d'avena");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Approfondisci qui: ");

  // Link con Ctrl/Cmd+K: javascript: rifiutato, https:// aggiunto
  await page.keyboard.press("ControlOrMeta+k");
  const linkDialog = page.getByRole("dialog", { name: "Inserisci link" });
  await linkDialog.getByLabel("Testo del link").fill("linee guida CREA");
  const href = linkDialog.getByLabel("Indirizzo");
  await href.fill("javascript:alert(1)");
  await linkDialog.getByRole("button", { name: "Applica" }).click();
  await expect(
    linkDialog.getByText(
      "Inserisci un indirizzo web che inizi con https:// oppure un'email.",
    ),
  ).toBeVisible();
  await href.fill("www.crea.gov.it");
  await expect(
    linkDialog.getByText("Verrà salvato come https://www.crea.gov.it/"),
  ).toBeVisible();
  await linkDialog.getByRole("button", { name: "Applica" }).click();
  await expect(linkDialog).toBeHidden();
  await expect(note.locator("a")).toHaveAttribute(
    "href",
    "https://www.crea.gov.it/",
  );
  // con il cursore nel link il pulsante risulta attivo
  await note.locator("a").click();
  await expect(
    dialog.getByRole("button", { name: "Inserisci link" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.getByText(/^\d+\/1\.000$/)).toBeVisible();

  await dialog.getByRole("button", { name: "Aggiungi video" }).click();
  await expect(dialog).toBeHidden();

  // nel database: documento ripulito e testo semplice
  const { data: saved } = await adminClient()
    .from("videos")
    .select("id, folder_id, note_doc, note_text")
    .eq("title", "Video di prova e2e")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  expect(saved?.note_text).toContain("- 170 g di skyr bianco");
  expect(JSON.stringify(saved?.note_doc)).toContain(
    '"href":"https://www.crea.gov.it/"',
  );

  // Cliente: anteprima di due righe nell'elenco della cartella (C15)
  const device = await newDevice(browser);
  const client = device.page;
  await device.context.route("https://www.crea.gov.it/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<p>CREA</p>" }),
  );
  await login(client, ANNA.email, ANNA.password);
  await expect(client).toHaveURL(/\/app/);
  await client.goto(`/app/video/${saved!.folder_id}`);
  const row = client.getByRole("link", { name: /Video di prova e2e/ });
  await expect(row.locator("strong")).toHaveText("Se non hai lo yogurt greco");
  // nell'anteprima il link è solo sottolineato: la card apre il video
  await expect(row.locator("a")).toHaveCount(0);

  // Riproduzione (C16): nota formattata, link in una nuova scheda
  await row.click();
  const section = client.getByRole("region", {
    name: "Nota della Dott.ssa Elena Verdi",
  });
  await expect(section.locator("strong")).toHaveText(
    "Se non hai lo yogurt greco",
  );
  await expect(section.getByRole("listitem")).toHaveCount(2);
  const link = section.getByRole("link", {
    name: "linee guida CREA (si apre in una nuova scheda)",
  });
  await expect(link).toHaveAttribute("href", "https://www.crea.gov.it/");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  const [popup] = await Promise.all([
    client.waitForEvent("popup"),
    link.click(),
  ]);
  await expect(popup).toHaveURL("https://www.crea.gov.it/");
  await device.context.close();
});

test("oltre i 1000 caratteri visibili la nota non si salva", async ({
  page,
}) => {
  await login(page, OWNER.email, OWNER.password);
  await page.waitForURL("**/admin/**");
  const { data: folder } = await adminClient()
    .from("video_folders")
    .select("id")
    .eq("name", FOLDER)
    .single();
  await page.goto(adminVideoFolderUrl(folder!.id));
  await page
    .getByRole("button", { name: "Modifica Video di prova e2e" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Modifica video" });
  const note = dialog.getByRole("textbox", { name: "Nota per i clienti" });
  await note.click();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.insertText(" " + "a".repeat(1000));
  await expect(dialog.getByText(/^1\.\d{3}\/1\.000$/)).toBeVisible();
  await dialog.getByRole("button", { name: "Salva" }).click();
  await expect(
    dialog.getByText("La nota supera i 1000 caratteri: accorciala."),
  ).toBeVisible();
});

test("le note cliniche non hanno il pulsante del link", async ({ page }) => {
  await login(page, OWNER.email, OWNER.password);
  await page.waitForURL("**/admin/**");
  await page.goto("/admin/clienti/aaaaaaaa-2222-4000-8000-000000000001/note");
  await expect(
    page.getByRole("toolbar", { name: "Formattazione del testo" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Inserisci link" }),
  ).toHaveCount(0);
});
