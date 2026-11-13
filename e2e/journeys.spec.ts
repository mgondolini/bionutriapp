import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { journeyEndDate } from "../src/lib/domain/journeys/dates";
import { todayInRome } from "../src/lib/domain/tracking/dates";

import {
  OWNER,
  adminClient,
  cleanup,
  createActiveClient,
  login,
  newDevice,
} from "./helpers";

/*
 * Percorso (mockup v5): creazione di 1 anno con 12 sessioni e date
 * calcolate, data modificata ferma al ricalcolo e ripristino, notifica
 * registrata, estensione con omaggio da un percorso concluso con ritorno
 * automatico In percorso, area cliente (home, pagina, .ics) e isolamento:
 * il cliente non vede l'omaggio né le sessioni di un altro cliente.
 * Link Google Meet: uno per ogni check (cliccabile e copiabile), visibile al
 * cliente solo sul prossimo check e mai quello di un altro.
 */

const STUDIO_ID = "aaaaaaaa-1111-4000-8000-000000000000";
const PASSWORD = "Percorso-2026!";
const SESSION_MEET = "https://meet.google.com/abc-defg-hij";
const OTHER_MEET = "https://meet.google.com/xyz-abcd-efg";
const OTHER_SESSION_MEET = "https://meet.google.com/ooo-oooo-ooo";
const phones: string[] = [];
let client: { clientId: string; email: string };
let other: { clientId: string };

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const suffix = Date.now();
  const email = `percorso.${suffix}@example.test`;
  const created = await createActiveClient({
    firstName: "Sara",
    lastName: `Percorso${suffix}`,
    password: PASSWORD,
    email,
  });
  phones.push(created.phone.e164);
  client = { clientId: created.clientId, email };

  const second = await createActiveClient({
    firstName: "Luca",
    lastName: `Altro${suffix}`,
    password: PASSWORD,
    email: null,
  });
  phones.push(second.phone.e164);
  other = { clientId: second.clientId };

  // una dieta, per controllare che la riga del percorso stia sopra
  const admin = adminClient();
  const { error } = await admin.from("client_files").insert({
    client_id: client.clientId,
    category: "diet",
    title: "Piano alimentare di prova",
    storage_path: `${STUDIO_ID}/${client.clientId}/${crypto.randomUUID()}.pdf`,
    size_bytes: 1024,
    valid_from: todayInRome(),
  });
  if (error) throw error;
});

test.afterAll(async () => {
  await cleanup(phones);
});

async function openJourneyTab(page: Page, clientId: string) {
  await page.goto(`/admin/clienti/${clientId}/percorso`);
  // i controlli rispondono dopo l'idratazione
  await page.waitForLoadState("networkidle");
}

function square(page: Page, name: RegExp) {
  return page
    .getByRole("group", { name: "Sessioni del percorso" })
    .getByRole("button", { name });
}

test("lo staff crea un percorso di 1 anno con 12 sessioni e le date calcolate", async ({
  page,
}) => {
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await openJourneyTab(page, client.clientId);
  await expect(page.getByText("Nessun percorso impostato")).toBeVisible();

  await page.getByRole("button", { name: "Imposta percorso" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "1 anno" }).click();
  await expect(dialog.getByRole("button", { name: "1 anno" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await dialog.getByLabel("Data di inizio").fill("2026-04-14");
  await expect(dialog.getByText("14 aprile 2027")).toBeVisible();
  await dialog.getByRole("button", { name: "Crea percorso" }).click();
  await expect(
    dialog.getByText("Confermi la creazione del nuovo percorso?"),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Crea percorso" }).click();
  await expect(page.getByText("Percorso creato")).toBeVisible();

  const squares = page
    .getByRole("group", { name: "Sessioni del percorso" })
    .getByRole("button");
  await expect(squares).toHaveCount(12);
  await expect(square(page, /^Onboarding 14 apr 2026/)).toBeVisible();
  await expect(square(page, /^Check 1 17 mag 2026/)).toBeVisible();
  await expect(square(page, /^Check 7 2 dic 2026/)).toBeVisible();
  await expect(square(page, /^Check 11 14 apr 2027/)).toBeVisible();
  await expect(page.getByText("14 aprile 2027")).toBeVisible();
});

test("una data modificata resta ferma al ricalcolo, si notifica e si ripristina", async ({
  page,
}) => {
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await openJourneyTab(page, client.clientId);

  await square(page, /^Check 8/).click();
  await page.getByLabel("Data della sessione").fill("2027-01-11");
  await page.getByLabel(/^Ora/).fill("10:30");
  await page.getByRole("button", { name: "Salva modifiche" }).click();
  await expect(page.getByText("Sessione salvata")).toBeVisible();
  await expect(square(page, /^Check 8 11 gen 2027.*Modificata/)).toBeVisible();

  // la push parte dopo la risposta: senza dispositivi resta "non consegnata"
  const admin = adminClient();
  await expect
    .poll(async () => {
      const { data } = await admin
        .from("journey_notifications")
        .select("kind, reference_date, reference_time, outcome")
        .eq("client_id", client.clientId);
      return data;
    })
    .toEqual([
      {
        kind: "date_changed",
        reference_date: "2027-01-11",
        reference_time: "10:30:00",
        outcome: "not_delivered",
      },
    ]);

  // nuova data di inizio: le altre si ricalcolano, Check 8 resta fermo
  await page.getByLabel("Data di inizio").fill("2026-04-16");
  await expect(
    page.getByText(
      "11 sessioni si ricalcolano, 1 resta ferma perché l’hai modificata a mano.",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Aggiorna le date" }).click();
  await expect(page.getByText("Percorso aggiornato")).toBeVisible();
  await expect(square(page, /^Check 1 19 mag 2026/)).toBeVisible();
  await expect(square(page, /^Check 8 11 gen 2027.*Modificata/)).toBeVisible();

  // ripristino: torna la data calcolata dal nuovo inizio
  await square(page, /^Check 8/).click();
  await page
    .getByRole("button", { name: "Ripristina la data calcolata" })
    .click();
  await expect(page.getByText("Data calcolata ripristinata")).toBeVisible();
  await expect(square(page, /^Check 8 6 gen 2027/)).toBeVisible();
  await expect(square(page, /^Check 8.*Modificata/)).toHaveCount(0);
});

test("dal percorso concluso si estende con l'omaggio e il cliente torna In percorso", async ({
  page,
}) => {
  const admin = adminClient();
  // Concluso dallo staff: il trigger chiude il percorso attivo
  const { error } = await admin
    .from("clients")
    .update({ journey_stage: "completed" })
    .eq("id", client.clientId);
  if (error) throw error;

  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await openJourneyTab(page, client.clientId);
  await expect(page.getByText(/Concluso oggi, in sola lettura/)).toBeVisible();

  await page.getByRole("button", { name: "Estendi o riprendi" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText(/Sara torna In percorso in automatico/),
  ).toBeVisible();
  // entro i 60 giorni: senza onboarding, omaggio aggiunto
  await expect(dialog.getByLabel("Aggiungi l’onboarding")).not.toBeChecked();
  await expect(
    dialog.getByLabel("Check omaggio aggiunto ai check"),
  ).toBeChecked();
  await dialog.getByRole("button", { name: "6 mesi" }).click();
  await dialog.getByLabel("Data di inizio").fill(todayInRome());
  await expect(dialog.getByText("6 sessioni:")).toBeVisible();
  await dialog.getByRole("button", { name: "Crea nuovo percorso" }).click();
  await dialog.getByRole("button", { name: "Crea nuovo percorso" }).click();
  await expect(page.getByText("Percorso creato")).toBeVisible();

  await expect(page.getByText("In percorso").first()).toBeVisible();
  await expect(square(page, /^Check omaggio.*Omaggio/)).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Percorso 1.*Concluso/ }),
  ).toBeVisible();
  await expect(
    page.getByText(/Sara è di nuovo In percorso, in automatico/),
  ).toBeVisible();

  const { data: events } = await admin
    .from("client_stage_events")
    .select("from_stage, to_stage, source")
    .eq("client_id", client.clientId)
    .order("changed_at", { ascending: false })
    .limit(1);
  expect(events).toEqual([
    { from_stage: "completed", to_stage: "in_progress", source: "automatic" },
  ]);
});

test("senza link il cliente vede solo Aggiungi al calendario, nella riga in home e nella pagina", async ({
  browser,
}) => {
  const device = await newDevice(browser);
  const page = device.page;
  await login(page, client.email, PASSWORD);
  await expect(page).toHaveURL(/\/app$/);

  const row = page.getByRole("link", { name: /^Il tuo percorso/ });
  const diet = page.getByText("Piano alimentare di prova");
  await expect(row).toBeVisible();
  await expect(diet).toBeVisible();
  const rowBox = (await row.boundingBox())!;
  const dietBox = (await diet.boundingBox())!;
  expect(rowBox.y).toBeLessThan(dietBox.y);

  await row.click();
  await expect(page).toHaveURL(/\/app\/percorso$/);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/Percorso 2 · Mese 1 di 6/)).toBeVisible();
  // l'omaggio compare come un normale check
  await expect(page.getByText("Check 1", { exact: true })).toBeVisible();
  await expect(page.getByText(/omaggio/i)).toHaveCount(0);
  await expect(page.getByText("Percorsi precedenti")).toBeVisible();

  await expect(
    page.getByRole("link", { name: "Partecipa su Google Meet" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Aggiungi al calendario" }).click();
  const sheet = page.getByRole("dialog", { name: "Aggiungi al calendario" });
  await expect(
    sheet.getByText(
      "Se hai già ricevuto l’invito da Google Calendar, non serve aggiungerlo.",
    ),
  ).toBeVisible();
  // fuori da iPhone la prima voce è Google Calendar
  const options = sheet.getByRole("listitem");
  await expect(options.first()).toContainText("Google Calendar");
  const google = sheet.getByRole("link", { name: /^Google Calendar/ });
  await expect(google).toHaveAttribute("target", "_blank");
  expect(
    new URL((await google.getAttribute("href"))!).searchParams.has("location"),
  ).toBe(false);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    sheet.getByRole("link", { name: /^Apple Calendar/ }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("check-1.ics");
  const { readFile } = await import("node:fs/promises");
  const ics = await readFile((await download.path())!, "utf8");
  expect(ics).not.toContain("meet.google.com");
  await device.context.close();
});

test("lo staff salva il link del check e lo vede cliccabile e copiabile", async ({
  page,
}) => {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await openJourneyTab(page, client.clientId);

  // la sessione mostrata è il prossimo check (l'omaggio)
  await expect(
    page.getByText("Nessun link Meet per questo check."),
  ).toBeVisible();

  // senza link l'evento non ha un Meet dell'app: lo crea Google Calendar
  await page.getByRole("button", { name: "Aggiungi al calendario" }).click();
  let google = page.getByRole("menuitem", { name: /^Google Calendar/ });
  let href = new URL((await google.getAttribute("href"))!);
  expect(href.searchParams.get("location")).toBeNull();
  expect(href.searchParams.get("details")).not.toContain("meet.google.com");
  expect(href.searchParams.get("add")).toBe(client.email);
  await page.keyboard.press("Escape");

  const field = page.getByLabel("Link Google Meet di questo check");
  await field.fill(`${SESSION_MEET}?authuser=1`);
  await page.getByRole("button", { name: "Salva link" }).click();
  await expect(
    page.getByText(
      "Inserisci un link Google Meet come https://meet.google.com/abc-defg-hij, senza altro dopo.",
    ),
  ).toBeVisible();

  await field.fill(SESSION_MEET);
  await page.getByRole("button", { name: "Salva link" }).click();
  await expect(page.getByText("Link salvato")).toBeVisible();

  const link = page.getByRole("link", { name: "meet.google.com/abc-defg-hij" });
  await expect(link).toHaveAttribute("href", SESSION_MEET);
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");

  await page.getByRole("button", { name: "Copia link" }).click();
  await expect(page.getByText("Link copiato")).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    SESSION_MEET,
  );

  await page.getByRole("button", { name: "Aggiungi al calendario" }).click();
  google = page.getByRole("menuitem", { name: /^Google Calendar/ });
  href = new URL((await google.getAttribute("href"))!);
  expect(href.searchParams.get("location")).toBe(SESSION_MEET);
  expect(href.searchParams.get("text")).toMatch(
    /^Check omaggio · S\. Percorso/,
  );
  await page.keyboard.press("Escape");

  // un altro check non eredita il link
  await square(page, /^Check 1 /).click();
  await expect(
    page.getByText("Nessun link Meet per questo check."),
  ).toBeVisible();
  await expect(page.getByLabel("Link Google Meet di questo check")).toHaveValue(
    "",
  );
});

test("il cliente vede il link solo sul prossimo check", async ({ browser }) => {
  const device = await newDevice(browser);
  const clientPage = device.page;
  await login(clientPage, client.email, PASSWORD);
  await expect(clientPage).toHaveURL(/\/app$/);
  await clientPage.goto("/app/percorso");
  await clientPage.waitForLoadState("networkidle");

  const join = clientPage.getByRole("link", {
    name: "Partecipa su Google Meet",
  });
  await expect(join).toHaveCount(1);
  await expect(join).toHaveAttribute("href", SESSION_MEET);
  await expect(join).toHaveAttribute("target", "_blank");
  await expect(join).toHaveAttribute("rel", "noopener noreferrer");
  await expect(clientPage.getByText(/ · Google Meet/)).toHaveCount(1);

  await clientPage
    .getByRole("button", { name: "Aggiungi al calendario" })
    .click();
  const sheet = clientPage.getByRole("dialog", {
    name: "Aggiungi al calendario",
  });
  await expect(
    sheet.getByText(/con il link alla videochiamata su Google Meet/),
  ).toBeVisible();
  const [download] = await Promise.all([
    clientPage.waitForEvent("download"),
    sheet.getByRole("link", { name: /^Altro calendario/ }).click(),
  ]);
  const { readFile } = await import("node:fs/promises");
  const ics = (await readFile((await download.path())!, "utf8")).replace(
    /\r\n /g,
    "",
  );
  expect(ics).toContain(`URL:${SESSION_MEET}`);
  expect(ics).not.toContain("ATTENDEE");
  await device.context.close();
});

test("il cliente non legge le sessioni di altri clienti né la nota e l'omaggio", async ({
  browser,
}) => {
  const admin = adminClient();
  await admin.rpc("create_client_journey", {
    p_client_id: other.clientId,
    p_previous_journey_id: null as unknown as string,
    p_kind: "first",
    p_duration_months: 6,
    p_start_date: todayInRome(),
    p_end_date: journeyEndDate(todayInRome(), 6),
    p_include_onboarding: false,
    p_gift_mode: "none",
    p_sessions: [
      { position: 0, type: "check", calculated_date: todayInRome() },
    ],
  });
  const { data: otherSessions } = await admin
    .from("journey_sessions")
    .select("id")
    .eq("client_id", other.clientId);
  expect(otherSessions?.length).toBe(1);
  await admin
    .from("clients")
    .update({ meeting_url: OTHER_MEET })
    .eq("id", other.clientId);
  await admin
    .from("journey_sessions")
    .update({ meeting_url: OTHER_SESSION_MEET, meeting_source: "manual" })
    .eq("client_id", other.clientId);

  // con la sessione della cliente: solo i propri link, mai quelli di Luca
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
  const { data: own } = await supabase.rpc("my_journey_sessions");
  expect(own?.length).toBeGreaterThan(0);
  const links = JSON.stringify(own);
  expect(links).not.toContain(OTHER_MEET);
  expect(links).not.toContain(OTHER_SESSION_MEET);
  const { data: otherRows } = await supabase
    .from("clients")
    .select("meeting_url")
    .eq("id", other.clientId);
  expect(otherRows).toEqual([]);
  await supabase.auth.signOut();

  const device = await newDevice(browser);
  const page = device.page;
  await login(page, client.email, PASSWORD);
  await expect(page).toHaveURL(/\/app$/);
  const response = await page.request.get(
    `/app/percorso/sessioni/${otherSessions![0]!.id}/calendario`,
  );
  expect(response.status()).toBe(404);

  // le tabelle non sono leggibili dal cliente, nemmeno le proprie righe
  await admin
    .from("journey_sessions")
    .update({ note: "Nota riservata allo studio" })
    .eq("client_id", client.clientId);
  await page.goto("/app/percorso");
  await expect(page.getByText("Nota riservata allo studio")).toHaveCount(0);
  await expect(page.getByText(/omaggio/i)).toHaveCount(0);
  const html = await page.content();
  expect(html).not.toContain(OTHER_MEET);
  expect(html).not.toContain(OTHER_SESSION_MEET);
  await device.context.close();
});
