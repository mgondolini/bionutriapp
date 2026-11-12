import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import {
  OWNER,
  adminClient,
  cleanup,
  createActiveClient,
  login,
  newDevice,
} from "./helpers";

/*
 * Note cliniche: anamnesi creata al primo accesso con la traccia standard,
 * testo formattato salvato con "Salva" e ritrovato dopo il ricaricamento,
 * avviso prima di uscire con modifiche non salvate, nota di visita con
 * eliminazione confermata, conflitto fra due dispositivi, smartphone a
 * 390 px (elenco, poi editor a tutto schermo) e nessuna lettura per il
 * cliente, nemmeno con l'API diretta.
 */

const PASSWORD = "Note-cliniche-2026!";
const phones: string[] = [];
let client: { clientId: string; email: string };

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const suffix = Date.now();
  const email = `note.${suffix}@example.test`;
  const created = await createActiveClient({
    firstName: "Giulia",
    lastName: `Note${suffix}`,
    password: PASSWORD,
    email,
  });
  phones.push(created.phone.e164);
  client = { clientId: created.clientId, email };
});

test.afterAll(async () => {
  await cleanup(phones);
});

const notesPath = () => `/admin/clienti/${client.clientId}/note`;

async function openNotes(page: Page, path = notesPath()) {
  await page.goto(path);
  // i controlli rispondono dopo l'idratazione
  await page.waitForLoadState("networkidle");
  await expect(page.locator(".ProseMirror")).toBeVisible();
}

const editor = (page: Page) => page.locator(".ProseMirror");
const saveButton = (page: Page) => page.getByRole("button", { name: "Salva" });

async function save(page: Page) {
  await saveButton(page).click();
  await expect(
    page.getByRole("status").filter({ hasText: /Salvato, oggi alle/ }),
  ).toBeVisible();
}

test("anamnesi: traccia, testo formattato, salvataggio e ricaricamento", async ({
  page,
}) => {
  await login(page, OWNER.email, OWNER.password);
  await page.waitForURL(/\/admin/);
  await openNotes(page);

  await expect(page.getByRole("link", { name: "Note cliniche" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(
    page.getByText("Solo tu, il cliente non la vede").locator("visible=true"),
  ).toBeVisible();
  await expect(
    page.getByText("Nessuna nota di visita. Aggiungi la prima dopo l'incontro."),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Titolo del documento" })).toHaveValue(
    "Anamnesi",
  );
  // l'anamnesi non si elimina
  await expect(page.getByRole("button", { name: "Elimina nota" })).toHaveCount(0);

  await page.getByRole("button", { name: "Inserisci traccia" }).click();
  for (const heading of [
    "Obiettivo",
    "Patologie e familiarità",
    "Allergie e intolleranze",
    "Abitudini",
    "Farmaci e integratori",
    "Sonno e stress",
  ]) {
    await expect(editor(page).getByRole("heading", { name: heading })).toBeVisible();
  }
  await expect(page.getByRole("status").filter({ hasText: "Modifiche non salvate" })).toBeVisible();

  // testo sotto "Obiettivo": parola in grassetto e parola evidenziata
  await editor(page).getByRole("heading", { name: "Obiettivo" }).click();
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.type("Perdita di peso ");
  await page.keyboard.press("Control+b");
  await page.keyboard.type("graduale");
  await page.keyboard.press("Control+b");
  await page.keyboard.type(" e ");
  const highlight = page
    .getByRole("toolbar", { name: "Formattazione del testo" })
    .getByRole("button", { name: "Evidenzia" });
  await highlight.click();
  await expect(highlight).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.type("glicemia");
  await highlight.click();

  await save(page);
  await expect(saveButton(page)).toBeDisabled();

  await page.reload();
  await expect(editor(page)).toBeVisible();
  await expect(editor(page).locator("h2").first()).toHaveText("Obiettivo");
  await expect(editor(page).locator("strong")).toHaveText("graduale");
  await expect(editor(page).locator("mark")).toHaveText("glicemia");
  await expect(editor(page)).toContainText("Perdita di peso graduale e glicemia");
  // l'elenco mostra l'anteprima, non il titolo della traccia
  await expect(
    page.getByRole("region", { name: "Documenti del cliente" }).getByText(/Aggiornata oggi/),
  ).toBeVisible();
});

test("nota di visita: avviso prima di uscire, titolo, eliminazione confermata", async ({
  page,
}) => {
  await login(page, OWNER.email, OWNER.password);
  await page.waitForURL(/\/admin/);
  await openNotes(page);

  await page.getByRole("button", { name: "Nuova nota" }).click();
  await page.waitForURL(/\/note\/[0-9a-f-]{36}$/);
  await page.waitForLoadState("networkidle");
  const title = page.getByRole("textbox", { name: "Titolo del documento" });
  await expect(title).toHaveValue("Visita di controllo");
  await expect(page.getByLabel("Data della visita")).toHaveValue(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome" }).format(new Date()),
  );

  await title.fill("Prima visita");
  await editor(page).click();
  await page.keyboard.type("Misure iniziali e obiettivi concordati");

  // con modifiche non salvate: conferma prima di cambiare scheda (annullata)
  const noteUrl = page.url();
  const dialog = page.waitForEvent("dialog");
  void page.getByRole("link", { name: "Profilo" }).click();
  const prompt = await dialog;
  expect(prompt.message()).toContain("modifiche non salvate");
  await prompt.dismiss();
  await expect(page).toHaveURL(noteUrl);

  // titolo vuoto rifiutato prima dell'invio
  await title.fill("   ");
  await saveButton(page).click();
  await expect(page.getByText("Scrivi un titolo.")).toBeVisible();
  await title.fill("Prima visita");
  await save(page);

  const list = page.getByRole("region", { name: "Documenti del cliente" });
  await expect(list.getByRole("link", { name: /Prima visita/ })).toContainText(
    "Misure iniziali e obiettivi concordati",
  );

  // eliminazione: annullata, poi confermata
  await page.getByRole("button", { name: "Elimina nota" }).click();
  const confirm = page.getByRole("dialog", { name: "Eliminare questa nota?" });
  await expect(confirm).toContainText('"Prima visita"');
  await confirm.getByRole("button", { name: "Annulla" }).click();
  await expect(confirm).toBeHidden();
  await page.getByRole("button", { name: "Elimina nota" }).click();
  await confirm.getByRole("button", { name: "Elimina" }).click();
  await page.waitForURL(new RegExp(`${notesPath()}$`));
  await expect(list.getByRole("link", { name: /Prima visita/ })).toHaveCount(0);
  await expect(page.getByText("Nessuna nota di visita.", { exact: false })).toBeVisible();
});

test("incolla da Word o da una pagina web: solo testo e formattazione supportata", async ({
  page,
}) => {
  await login(page, OWNER.email, OWNER.password);
  await page.waitForURL(/\/admin/);
  await openNotes(page);
  await page.getByRole("button", { name: "Nuova nota" }).click();
  await page.waitForURL(/\/note\/[0-9a-f-]{36}$/);
  await page.waitForLoadState("networkidle");
  await editor(page).click();

  const html = [
    "<!--[if gte mso 9]><xml><o:OfficeDocumentSettings/></xml><![endif]-->",
    '<style>p.MsoNormal{color:red}</style>',
    '<h1 style="color:#ff0000">Titolo incollato</h1>',
    '<p class="MsoNormal" style="font-family:Calibri;color:#0000ff">Testo <span style="font-weight:700">forte</span> e <span style="font-style:italic">inclinato</span> con <a href="https://example.com">link</a></p>',
    '<img src="https://example.com/x.png" alt="foto">',
    "<table><tr><td>Cella</td></tr></table>",
    '<p><span style="background-color:yellow">giallo</span></p>',
  ].join("");
  await editor(page).evaluate((element, data) => {
    const transfer = new DataTransfer();
    transfer.setData("text/html", data);
    transfer.setData("text/plain", "fallback");
    element.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: transfer, bubbles: true, cancelable: true }),
    );
  }, html);

  await expect(editor(page).locator("h2")).toHaveText("Titolo incollato");
  await expect(editor(page).locator("strong")).toHaveText("forte");
  await expect(editor(page).locator("em")).toHaveText("inclinato");
  await expect(editor(page)).toContainText("con link");
  await expect(editor(page)).toContainText("Cella");
  await expect(editor(page).locator("a, img, table, mark, [style], [class]")).toHaveCount(0);
  await expect(editor(page)).not.toContainText("MsoNormal");
  await save(page);

  // pulizia: la nota non serve agli altri test
  await page.getByRole("button", { name: "Elimina nota" }).click();
  await page
    .getByRole("dialog", { name: "Eliminare questa nota?" })
    .getByRole("button", { name: "Elimina" })
    .click();
  await page.waitForURL(new RegExp(`${notesPath()}$`));
});

test("conflitto: un altro dispositivo ha salvato prima", async ({ page, browser }) => {
  await login(page, OWNER.email, OWNER.password);
  await page.waitForURL(/\/admin/);
  await openNotes(page);

  const other = await newDevice(browser);
  await login(other.page, OWNER.email, OWNER.password);
  await other.page.waitForURL(/\/admin/);
  await openNotes(other.page);

  await editor(other.page).click();
  await other.page.keyboard.press("Control+End");
  await other.page.keyboard.press("Enter");
  await other.page.keyboard.type("Aggiunta dal tablet");
  await save(other.page);
  await other.context.close();

  await editor(page).click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Aggiunta dal computer");
  await saveButton(page).click();
  const alert = page.getByRole("alert").filter({
    hasText: "Questa nota è stata modificata da un altro dispositivo",
  });
  await expect(alert).toBeVisible();
  // nulla è stato sovrascritto
  const admin = adminClient();
  const before = await admin
    .from("client_notes")
    .select("content_text")
    .eq("client_id", client.clientId)
    .eq("kind", "anamnesis")
    .single();
  expect(before.data?.content_text).toContain("Aggiunta dal tablet");
  expect(before.data?.content_text).not.toContain("Aggiunta dal computer");

  await alert.getByRole("button", { name: "Sovrascrivi comunque" }).click();
  await expect(alert).toBeHidden();
  await expect(
    page.getByRole("status").filter({ hasText: /Salvato, oggi alle/ }),
  ).toBeVisible();
  const after = await admin
    .from("client_notes")
    .select("content_text")
    .eq("client_id", client.clientId)
    .eq("kind", "anamnesis")
    .single();
  expect(after.data?.content_text).toContain("Aggiunta dal computer");
  expect(after.data?.content_text).not.toContain("Aggiunta dal tablet");
});

test("smartphone 390 px: elenco, poi editor a tutto schermo con Indietro", async ({
  browser,
}) => {
  const context = await browser.newContext({
    locale: "it-IT",
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await login(page, OWNER.email, OWNER.password);
  await page.waitForURL(/\/admin/);
  await page.goto(notesPath());
  await page.waitForLoadState("networkidle");
  // in sviluppo l'indicatore di Next copre il pulsante "Aa" in basso a sinistra
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });

  // elenco: niente editor, "Nuova nota" in basso
  await expect(page.locator(".ProseMirror")).toBeHidden();
  await expect(page.getByText("Solo tu vedi questi documenti, il cliente no.")).toBeVisible();
  await page.getByRole("link", { name: /Anamnesi/ }).click();
  await page.waitForURL(/\/note\/[0-9a-f-]{36}$/);
  await expect(editor(page)).toBeVisible();

  // editor a tutto schermo: intestazione e schede nascoste, barra in basso da 44 px
  await expect(page.getByRole("navigation", { name: /schede|Sezioni/i })).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "Anamnesi" })).toBeVisible();
  const toolbar = page.getByRole("toolbar", { name: "Formattazione del testo" });
  await expect(toolbar.getByRole("button", { name: "Grassetto" })).toHaveCSS("height", "44px");
  await expect(
    toolbar.getByRole("button", { name: /^Stile del paragrafo: / }),
  ).toBeVisible();
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(390);

  // "Aa": il paragrafo diventa un titolo
  await editor(page).click();
  await page.keyboard.press("Control+End");
  await page.keyboard.press("Enter");
  await page.keyboard.type("Dal telefono");
  await toolbar.getByRole("button", { name: /Stile del paragrafo/ }).click();
  await page.getByRole("menuitemradio", { name: "Sottotitolo" }).click();
  await expect(editor(page).locator("h3", { hasText: "Dal telefono" })).toBeVisible();
  await page.getByRole("button", { name: "Salva" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: /Salvato, oggi alle/ }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Torna all'elenco dei documenti" }).click();
  await page.waitForURL(new RegExp(`${notesPath()}$`));
  await expect(page.getByRole("link", { name: /Anamnesi/ })).toBeVisible();
  await context.close();
});

test("il cliente non legge le note, nemmeno con l'API diretta", async ({ page }) => {
  const admin = adminClient();
  const { count } = await admin
    .from("client_notes")
    .select("id", { count: "exact", head: true })
    .eq("client_id", client.clientId);
  expect(count).toBeGreaterThan(0);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: client.email,
    password: PASSWORD,
  });
  expect(loginError).toBeNull();
  const { data, error } = await supabase
    .from("client_notes")
    .select("id, content_text")
    .eq("client_id", client.clientId);
  expect(error).toBeNull();
  expect(data).toEqual([]);
  const { error: insertError } = await supabase.from("client_notes").insert({
    studio_id: "aaaaaaaa-1111-4000-8000-000000000000",
    client_id: client.clientId,
    kind: "visit",
    title: "Mia",
    visit_date: "2026-01-01",
  });
  expect(insertError).not.toBeNull();
  await supabase.auth.signOut();

  // e l'area admin non è raggiungibile
  await login(page, client.email, PASSWORD);
  await page.waitForURL(/\/app/);
  await page.goto(notesPath());
  await expect(page).not.toHaveURL(new RegExp(notesPath()));
  await expect(page.locator(".ProseMirror")).toHaveCount(0);
});
