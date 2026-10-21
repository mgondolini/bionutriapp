import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { copy } from "../src/lib/copy/it";
import { addDays, todayInRome } from "../src/lib/domain/tracking/dates";
import { weeklyHabitStats } from "../src/lib/domain/tracking/habits";
import { averageText } from "../src/lib/domain/tracking/labels";
import {
  adminClient,
  cleanup,
  createActiveClient,
  login,
  newDevice,
  OWNER,
} from "./helpers";

/*
 * Flusso critico "check-in giornaliero" (DEV-18): una cliente In percorso
 * compila il check-in di oggi, lo corregge e compila quello di ieri; il
 * titolare vede giorni compilati e media aggiornati. In più: l'obiettivo
 * dell'acqua cambiato dal titolare cambia subito le descrizioni dei voti
 * (T-07), e un valore fuori limite è rifiutato dal form e dal database (T-04).
 */

const STUDIO_ID = "aaaaaaaa-1111-4000-8000-000000000000";
const PASSWORD = "password-checkin-1";
let phone = "";
const email = `checkin.${Date.now().toString(36)}@example.test`;
let clientId = "";

const QUESTIONS = {
  steps: "Quanto ti sei avvicinato oggi al tuo obiettivo di passi?",
  sleep: "Come hai dormito stanotte rispetto al tuo obiettivo?",
  water: "Quanta acqua hai bevuto oggi rispetto al tuo obiettivo?",
} as const;
type Habit = keyof typeof QUESTIONS;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const client = await createActiveClient({
    firstName: "Giulia",
    lastName: "Check-in",
    password: PASSWORD,
    email,
  });
  clientId = client.clientId;
  phone = client.phone.e164;
});

test.afterAll(async () => {
  await cleanup([phone]);
});

function group(page: Page, habit: Habit) {
  return page.getByRole("radiogroup", { name: QUESTIONS[habit] });
}

async function choose(page: Page, values: Partial<Record<Habit, number>>) {
  for (const [habit, value] of Object.entries(values)) {
    await group(page, habit as Habit)
      .getByText(String(value), { exact: true })
      .click();
  }
}

async function saveCheckin(page: Page) {
  await page.getByRole("button", { name: "Salva check-in" }).click();
  await expect(page).toHaveURL(/\/app\/tracking$/);
  await expect(page.getByText("Check-in salvato.").last()).toBeVisible();
}

async function changeWaterGoal(page: Page, liters: string) {
  await page.getByRole("button", { name: "Modifica obiettivi" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Litri di acqua al giorno").fill(liters);
  await dialog.getByRole("button", { name: "Salva obiettivi" }).click();
  await expect(page.getByText("Obiettivi salvati.")).toBeVisible();
  await expect(dialog).toBeHidden();
}

test("check-in di oggi, correzione, check-in di ieri; il titolare vede giorni e media", async ({
  page,
  browser,
}) => {
  const today = todayInRome();
  const yesterday = addDays(today, -1);
  const trackingPage = `/admin/clienti/${clientId}/tracking`;

  // Il titolare imposta l'obiettivo personale dell'acqua: 3 L
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await page.goto(trackingPage);
  await expect(
    page.getByText("Nessun voto questa settimana").first(),
  ).toBeVisible();
  await changeWaterGoal(page, "3");
  const goals = page.getByRole("region", { name: "Obiettivi personali" });
  await expect(goals.getByText("3 L", { exact: true })).toBeVisible();

  // La cliente vede l'obiettivo e le descrizioni ancorate a 3 L
  const giulia = await newDevice(browser);
  const client = giulia.page;
  await login(client, email, PASSWORD);
  await expect(client).toHaveURL(/\/app$/);
  await expect(
    client
      .getByRole("region", { name: "Da registrare" })
      .getByText("Check-in di oggi"),
  ).toBeVisible();
  await client.goto("/app/tracking");
  await client.getByRole("link", { name: "Compila il check-in" }).click();
  await expect(client).toHaveURL(/\/app\/tracking\/check-in$/);
  await expect(client.getByText("Il tuo obiettivo: 3 L")).toBeVisible();
  await choose(client, { water: 4 });
  await expect(
    client.getByText("4 · Quasi raggiunto · circa 2,5 L"),
  ).toBeVisible();

  // Check-in di oggi: un solo salvataggio per i tre voti
  await choose(client, { steps: 4, sleep: 5 });
  await saveCheckin(client);
  await expect(client.getByText(/Completato, a domani!/)).toBeVisible();

  // Correzione: i valori si precaricano e si modificano
  await client.getByRole("link", { name: "Modifica il check-in" }).click();
  await expect(
    client.getByText(/Hai già compilato questo giorno/),
  ).toBeVisible();
  await expect(
    group(client, "steps").getByRole("radio", { name: "4" }),
  ).toBeChecked();
  await choose(client, { steps: 2 });
  await saveCheckin(client);

  // Check-in di ieri
  await client.goto("/app/tracking/check-in");
  await client.getByRole("link", { name: /^Ieri/ }).click();
  await expect(client).toHaveURL(/giorno=ieri/);
  await expect(
    group(client, "steps").getByRole("radio", { name: "5" }),
  ).not.toBeChecked();
  await choose(client, { steps: 5, sleep: 3, water: 2 });
  await saveCheckin(client);

  // Nel database: tre voti per giorno, oggi i passi corretti
  const { data: rows } = await adminClient()
    .from("tracking_entries")
    .select("value, recorded_on, metrics(key)")
    .eq("client_id", clientId);
  const stored = (rows ?? []).map(
    (row) =>
      `${row.recorded_on}:${(row.metrics as unknown as { key: string }).key}:${row.value}`,
  );
  expect(stored.sort()).toEqual(
    [
      `${today}:steps:2`,
      `${today}:sleep:5`,
      `${today}:water:4`,
      `${yesterday}:steps:5`,
      `${yesterday}:sleep:3`,
      `${yesterday}:water:2`,
    ].sort(),
  );

  // Il titolare vede giorni compilati e media della settimana (il lunedì ieri è nella settimana prima)
  const steps = weeklyHabitStats(
    [
      { recordedOn: today, value: 2 },
      { recordedOn: yesterday, value: 5 },
    ],
    today,
  );
  await page.reload();
  const stepsCard = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Passi" }) });
  await expect(stepsCard).toContainText(
    copy.tracking.filledDaysOfWeek(steps.filledDays),
  );
  await expect(stepsCard).toContainText(averageText(steps.average!));
  await expect(stepsCard).toContainText("Voto di oggi: 2");

  // "Ripristina predefinito": la cliente torna all'obiettivo dello studio (2 L)
  await page.getByRole("button", { name: "Modifica obiettivi" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Ripristina l'obiettivo predefinito: Acqua" })
    .click();
  await expect(
    page.getByText("Obiettivo predefinito ripristinato."),
  ).toBeVisible();
  await client.goto("/app/tracking/check-in");
  await expect(client.getByText("Il tuo obiettivo: 2 L")).toBeVisible();
  await expect(
    client.getByText("4 · Quasi raggiunto · circa 1,5 L"),
  ).toBeVisible();

  await giulia.context.close();
});

test("un valore fuori limite è rifiutato dal form e, se forzato, dal database", async ({
  page,
}) => {
  await login(page, email, PASSWORD);
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/app/tracking/circ_waist");
  await page.getByLabel("Valore").fill("300");
  await page.getByRole("button", { name: "Salva misura" }).click();
  await expect(
    page.getByText("Il valore deve essere tra 10 e 250 cm."),
  ).toBeVisible();

  // Forzato: inserimento diretto con la sessione della cliente, senza l'app
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  expect(loginError).toBeNull();
  const { data: metric } = await supabase
    .from("metrics")
    .select("id")
    .eq("key", "circ_waist")
    .single();
  const { error } = await supabase.from("tracking_entries").insert({
    studio_id: STUDIO_ID,
    client_id: clientId,
    metric_id: metric!.id,
    value: 300,
    recorded_on: todayInRome(),
  });
  expect(error?.code).toBe("23514");

  // Un valore valido con la virgola si salva
  await page.getByLabel("Valore").fill("76,4");
  await page.getByRole("button", { name: "Salva misura" }).click();
  await expect(page.getByText("Misura salvata.")).toBeVisible();
  await expect(page.getByText("76,4 cm").first()).toBeVisible();
});
