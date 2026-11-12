import { expect, test, type Page } from "@playwright/test";

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
 */

const STUDIO_ID = "aaaaaaaa-1111-4000-8000-000000000000";
const PASSWORD = "Percorso-2026!";
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

test("il cliente vede la riga in home sopra la dieta, la pagina e scarica l'.ics", async ({
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
  await expect(page.getByText(/Percorso 2 · Mese 1 di 6/)).toBeVisible();
  // l'omaggio compare come un normale check
  await expect(page.getByText("Check 1", { exact: true })).toBeVisible();
  await expect(page.getByText(/omaggio/i)).toHaveCount(0);
  await expect(page.getByText("Percorsi precedenti")).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("link", { name: "Aggiungi al calendario" }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("check-1.ics");
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
  await device.context.close();
});
