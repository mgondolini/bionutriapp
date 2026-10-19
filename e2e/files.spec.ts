import { expect, test, type BrowserContext } from "@playwright/test";

import { samplePdf } from "../scripts/sample-pdf";
import { adminClient, login, newDevice, OWNER } from "./helpers";

/*
 * Flusso critico "caricamento di un file" (DEV-18): il titolare carica un
 * PDF per una cliente In percorso (Anna, dal seed), la cliente lo vede in
 * home con "Nuovo" e lo apre, il titolare vede "Letto il…". In più: file
 * rifiutati nel browser, scaricamento, prima lettura che non cambia,
 * eliminazione con conferma.
 */

const ANNA = {
  id: "aaaaaaaa-2222-4000-8000-000000000001",
  email: "anna.rossi@example.test",
  password: "password123",
};
const MB = 1024 * 1024;
const run = Date.now().toString(36);
const TITLE = `Piano alimentare prova ${run}`;
const NOTE = "Ricordati di bere almeno 2 litri d'acqua al giorno.";
const filesPage = `/admin/clienti/${ANNA.id}/file`;

test.describe.configure({ mode: "serial" });

/** Rete di sicurezza: righe e oggetti creati dal test, se il test si è fermato prima dell'eliminazione. */
test.afterAll(async () => {
  const admin = adminClient();
  const { data } = await admin
    .from("client_files")
    .delete()
    .eq("client_id", ANNA.id)
    .like("title", `%${run}%`)
    .select("storage_path");
  const paths = (data ?? []).map((row) => row.storage_path);
  if (paths.length > 0) await admin.storage.from("client-files").remove(paths);
});

/** URL firmati richiesti dal browser (anche dalle finestre aperte dalla pagina). */
function captureSignedUrls(context: BrowserContext) {
  const urls: string[] = [];
  context.on("request", (request) => {
    if (request.url().includes("/storage/v1/object/sign/client-files/")) {
      urls.push(request.url());
    }
  });
  return urls;
}

async function readFirstReadAt(title: string) {
  const { data, error } = await adminClient()
    .from("client_files")
    .select("first_read_at, storage_path, size_bytes")
    .eq("title", title)
    .single();
  if (error) throw error;
  return data;
}

test("il titolare carica un PDF, la cliente lo apre, il titolare vede Letto il…", async ({
  page,
  browser,
}) => {
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await page.goto(filesPage);
  const publish = page.getByRole("button", { name: "Pubblica file" });
  await expect(publish).toBeEnabled();
  const input = page.locator('input[type="file"]');

  // Controlli nel browser, prima di qualsiasi caricamento
  await input.setInputFiles({
    name: "relazione.pdf",
    mimeType: "application/pdf",
    // un .docx è un archivio zip: inizia con "PK"
    buffer: Buffer.from("PK\u0003\u0004 documento word rinominato"),
  });
  await expect(page.getByText("Il file non è un PDF valido.")).toBeVisible();
  await input.setInputFiles({
    name: "relazione.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: Buffer.from("PK\u0003\u0004"),
  });
  await expect(page.getByText("Puoi caricare solo file PDF.")).toBeVisible();
  await input.setInputFiles({
    name: "troppo-grande.pdf",
    mimeType: "application/pdf",
    buffer: samplePdf("Troppo grande", 11 * MB),
  });
  await expect(page.getByText("Il file supera i 10 MB.")).toBeVisible();

  // PDF da 9 MB: caricamento diretto su Storage e conferma
  await input.setInputFiles({
    name: "Piano_prova.pdf",
    mimeType: "application/pdf",
    buffer: samplePdf(TITLE, 9 * MB),
  });
  await expect(page.getByText("Piano_prova.pdf")).toBeVisible();
  await expect(
    page.getByText(/9 MB · pronto per la pubblicazione/),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Dieta" }).check();
  await page.getByLabel("Titolo visibile al cliente").fill(TITLE);
  await page.getByLabel("Nota per il cliente (facoltativa)").fill(NOTE);
  await publish.click();
  await expect(page.getByText(`"${TITLE}" pubblicato.`)).toBeVisible({
    timeout: 60_000,
  });

  const row = page.getByRole("row").filter({ hasText: TITLE });
  await expect(row).toContainText("In corso");
  await expect(row).toContainText("Non ancora letto");
  const stored = await readFirstReadAt(TITLE);
  expect(stored.size_bytes).toBe(9 * MB);
  expect(stored.first_read_at).toBeNull();

  // La cliente lo vede in home con "Nuovo" e la nota
  const anna = await newDevice(browser);
  const signedUrls = captureSignedUrls(anna.context);
  await login(anna.page, ANNA.email, ANNA.password);
  await expect(anna.page).toHaveURL(/\/app$/);
  const latest = anna.page.getByRole("region", { name: "Ultimo file" });
  await expect(latest.getByRole("heading", { name: TITLE })).toBeVisible();
  await expect(latest.getByText("Nuovo", { exact: true })).toBeVisible();
  await expect(latest.getByText(NOTE)).toBeVisible();

  // "Apri PDF": finestra aperta al clic, URL firmato di 60 secondi
  const popupPromise = anna.page.waitForEvent("popup");
  await latest.getByRole("button", { name: `Apri ${TITLE}` }).click();
  const popup = await popupPromise;
  await expect.poll(() => signedUrls.length).toBeGreaterThan(0);
  const signed = new URL(signedUrls[0]!);
  expect(signed.pathname).toContain(stored.storage_path);
  const token = signed.searchParams.get("token")!;
  const claims = JSON.parse(
    Buffer.from(token.split(".")[1]!, "base64url").toString(),
  );
  expect(claims.exp - claims.iat).toBe(60);
  const head = await anna.context.request.get(signed.toString(), {
    headers: { Range: "bytes=0-4" },
  });
  expect(head.ok()).toBe(true);
  expect(await head.text()).toBe("%PDF-");
  await popup.close();

  // Dopo l'apertura "Nuovo" scompare
  await expect(latest.getByText("Nuovo", { exact: true })).toBeHidden();
  const firstRead = (await readFirstReadAt(TITLE)).first_read_at;
  expect(firstRead).not.toBeNull();

  // È il file in corso della pagina Diete
  await anna.page.goto("/app/diete");
  const current = anna.page.getByRole("region", { name: "In corso" });
  await expect(current.getByRole("heading", { name: TITLE })).toBeVisible();

  // "Scarica": nome ricavato dal titolo; la prima lettura non cambia
  const downloadPromise = anna.page.waitForEvent("download");
  await current.getByRole("button", { name: `Scarica ${TITLE}` }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe(`${TITLE}.pdf`);
  await download.cancel();
  expect((await readFirstReadAt(TITLE)).first_read_at).toBe(firstRead);
  await anna.context.close();

  // Il titolare vede "Letto il gg/mm/aaaa"
  await page.reload();
  const day = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Rome",
  }).format(new Date(firstRead!));
  await expect(page.getByRole("row").filter({ hasText: TITLE })).toContainText(
    `Letto il ${day}`,
  );

  // Filtro per categoria
  await page.getByRole("link", { name: /^Report/ }).click();
  await expect(page).toHaveURL(/categoria=report/);
  await expect(page.getByRole("row").filter({ hasText: TITLE })).toHaveCount(0);
  await page.getByRole("link", { name: /^Dieta/ }).click();
  await expect(page.getByRole("row").filter({ hasText: TITLE })).toHaveCount(1);

  // Eliminazione con conferma: riga e oggetto in Storage
  await page
    .getByRole("row")
    .filter({ hasText: TITLE })
    .getByRole("button", { name: `Elimina ${TITLE}` })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Eliminare questo file?");
  await expect(dialog).toContainText(`Letto il ${day}`);
  await dialog.getByRole("button", { name: "Elimina file" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("row").filter({ hasText: TITLE })).toHaveCount(0);

  const { data: rows } = await adminClient()
    .from("client_files")
    .select("id")
    .eq("title", TITLE);
  expect(rows).toHaveLength(0);
  const folder = stored.storage_path.split("/").slice(0, 2).join("/");
  const name = stored.storage_path.split("/")[2]!;
  const { data: objects } = await adminClient()
    .storage.from("client-files")
    .list(folder, { search: name });
  expect(objects).toHaveLength(0);
});

test("il server rifiuta un file non PDF o troppo grande anche se il browser viene aggirato", async ({
  page,
}) => {
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await page.goto(filesPage);
  const publish = page.getByRole("button", { name: "Pubblica file" });
  await expect(publish).toBeEnabled();

  // Il browser vede un PDF valido, ma a Storage arriva altro
  let replacement: Buffer = Buffer.alloc(0);
  await page.route(
    "**/storage/v1/object/upload/sign/client-files/**",
    (route) => route.continue({ postData: replacement }),
  );

  const attempt = async (title: string, body: Buffer, message: string) => {
    replacement = body;
    await page.locator('input[type="file"]').setInputFiles({
      name: "valido.pdf",
      mimeType: "application/pdf",
      buffer: samplePdf(title),
    });
    await page.getByLabel("Titolo visibile al cliente").fill(title);
    await publish.click();
    await expect(page.getByText(message)).toBeVisible({ timeout: 60_000 });
    const { data } = await adminClient()
      .from("client_files")
      .select("id")
      .eq("title", title);
    expect(data).toHaveLength(0);
  };

  // .docx rinominato: caricato, poi eliminato dalla verifica del server
  await attempt(
    `Docx ${run}`,
    Buffer.from("PK\u0003\u0004 documento word rinominato"),
    "Il file non è un PDF valido.",
  );
  // oltre 10 MB: rifiutato già dal bucket (limite di Storage)
  await attempt(
    `Grande ${run}`,
    samplePdf("grande", 11 * MB),
    "Il file supera i 10 MB.",
  );

  // nessun oggetto rimasto in Storage per Anna oltre a quelli delle righe
  const admin = adminClient();
  const { data: rows } = await admin
    .from("client_files")
    .select("storage_path")
    .eq("client_id", ANNA.id);
  const { data: objects } = await admin.storage
    .from("client-files")
    .list(`aaaaaaaa-1111-4000-8000-000000000000/${ANNA.id}`);
  const expected = (rows ?? []).map((row) => row.storage_path.split("/")[2]);
  expect((objects ?? []).map((o) => o.name).sort()).toEqual(expected.sort());
});
