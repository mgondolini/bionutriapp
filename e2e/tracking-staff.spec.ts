import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { addDays, todayInRome } from "../src/lib/domain/tracking/dates";
import { formatLongDate } from "../src/lib/format";
import {
  adminClient,
  cleanup,
  createActiveClient,
  login,
  newDevice,
  OWNER,
} from "./helpers";

/*
 * Registrazioni del nutrizionista (A-15, A-16, A-17, T-03), con un telefono
 * (375 × 812, touch) per la parte admin: il titolare inserisce una
 * circonferenza, la legge nel grafico toccando il punto, corregge una
 * registrazione della cliente; la cliente vede le etichette dell'autore e
 * nessun pulsante sulle registrazioni dello staff, nemmeno con l'API diretta.
 */

const STUDIO_ID = "aaaaaaaa-1111-4000-8000-000000000000";
const PASSWORD = "password-staff-1";
const email = `staff.tracking.${Date.now().toString(36)}@example.test`;
let phone = "";
let clientId = "";

const PHONE_VIEWPORT = { width: 375, height: 812 };
const today = todayInRome();
const clientDay = addDays(today, -10);

test.describe.configure({ mode: "serial" });
test.use({ viewport: PHONE_VIEWPORT, hasTouch: true, isMobile: true });

test.beforeAll(async () => {
  const client = await createActiveClient({
    firstName: "Sara",
    lastName: "Misure",
    password: PASSWORD,
    email,
  });
  clientId = client.clientId;
  phone = client.phone.e164;

  // circonferenza della cliente (lato server senza sessione: autore cliente)
  const admin = adminClient();
  const { data: metric, error: metricError } = await admin
    .from("metrics")
    .select("id")
    .eq("studio_id", STUDIO_ID)
    .eq("key", "circ_waist")
    .single();
  if (metricError) throw metricError;
  const { error } = await admin.from("tracking_entries").insert({
    client_id: clientId,
    metric_id: metric.id,
    value: 85,
    recorded_on: clientDay,
  });
  if (error) throw error;
});

test.afterAll(async () => {
  await cleanup([phone]);
});

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

function historyRow(page: Page, value: string) {
  return page.getByTestId("entry-row").filter({ hasText: value });
}

test("il nutrizionista inserisce una circonferenza dal telefono e la legge nel grafico", async ({
  page,
}) => {
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await page.goto(`/admin/clienti/${clientId}/tracking`);
  await expect(
    page.getByRole("heading", { name: "Circonferenze" }),
  ).toBeVisible();
  await expectNoHorizontalScroll(page);

  await page
    .getByRole("button", { name: "Aggiungi registrazione: Circ. Vita" })
    .tap();
  const panel = page.getByRole("dialog");
  await expect(panel).toBeVisible();
  // pannello dal basso, largo quanto lo schermo (a fine animazione)
  await expect
    .poll(async () => {
      const box = await panel.boundingBox();
      return box ? [box.width, Math.round(box.y + box.height)] : null;
    })
    .toEqual([PHONE_VIEWPORT.width, PHONE_VIEWPORT.height]);
  await expect(panel.getByLabel("Data")).toHaveValue(today);

  // stessa validazione dell'area cliente: fuori limite rifiutato
  const value = panel.getByLabel("Valore");
  await value.fill("400");
  await panel.getByRole("button", { name: "Salva registrazione" }).tap();
  await expect(
    panel.getByText("Il valore deve essere tra 10 e 250 cm."),
  ).toBeVisible();

  await value.fill("82,5");
  await panel.getByRole("button", { name: "Salva registrazione" }).tap();
  await expect(page.getByText("Registrazione salvata.")).toBeVisible();
  await expect(panel).toBeHidden();

  await page.goto(`/admin/clienti/${clientId}/tracking/circ_waist`);
  await expect(historyRow(page, "82,5 cm")).toContainText(
    "Inserita dal nutrizionista",
  );
  await expectNoHorizontalScroll(page);

  // tocco sul punto più recente: valore e data nel tooltip
  const dots = page.locator(".recharts-line-dots circle");
  await expect(dots).toHaveCount(2);
  await dots.last().tap();
  const tooltip = page.getByTestId("chart-tooltip");
  await expect(tooltip).toContainText("82,5 cm");
  await expect(tooltip).toContainText(formatLongDate(today));
});

test("la cliente vede l'etichetta e non può modificare la registrazione dello staff", async ({
  browser,
}) => {
  const sara = await newDevice(browser);
  const page = sara.page;
  await login(page, email, PASSWORD);
  await expect(page).toHaveURL(/\/app/);
  await page.goto("/app/tracking/circ_waist");

  const staffRow = historyRow(page, "82,5 cm");
  await expect(staffRow).toContainText("Inserita dal nutrizionista");
  await expect(staffRow.getByRole("button")).toHaveCount(0);
  // la propria registrazione resta modificabile
  await expect(
    historyRow(page, "85,0 cm").getByRole("button", {
      name: `Correggi la registrazione del ${formatLongDate(clientDay)}`,
    }),
  ).toBeVisible();
  await sara.context.close();

  // nemmeno con l'API diretta di Supabase
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
  const updated = await supabase
    .from("tracking_entries")
    .update({ value: 70, created_by_role: "client" })
    .eq("client_id", clientId)
    .eq("created_by_role", "staff")
    .select("id");
  expect(updated.error).toBeNull();
  expect(updated.data).toHaveLength(0);
  const deleted = await supabase
    .from("tracking_entries")
    .delete()
    .eq("client_id", clientId)
    .eq("created_by_role", "staff")
    .select("id");
  expect(deleted.data).toHaveLength(0);

  // un autore "staff" inviato dalla cliente viene ignorato
  const { data: metric } = await supabase
    .from("metrics")
    .select("id")
    .eq("key", "circ_glutes")
    .single();
  const inserted = await supabase
    .from("tracking_entries")
    .insert({
      client_id: clientId,
      metric_id: metric!.id,
      value: 99,
      recorded_on: today,
      created_by_role: "staff",
    })
    .select("created_by_role")
    .single();
  expect(inserted.data?.created_by_role).toBe("client");
  await supabase.auth.signOut();
});

test("il nutrizionista corregge una registrazione della cliente e l'etichetta si aggiorna", async ({
  page,
}) => {
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await page.goto(`/admin/clienti/${clientId}/tracking/circ_waist`);

  const row = historyRow(page, "85,0 cm");
  await expect(row).not.toContainText("Modificata dal nutrizionista");
  await row
    .getByRole("button", {
      name: `Correggi la registrazione del ${formatLongDate(clientDay)}`,
    })
    .tap();
  const panel = page.getByRole("dialog");
  await panel.getByLabel("Valore").fill("84");
  await panel.getByRole("button", { name: "Salva correzione" }).tap();
  await expect(page.getByText("Registrazione corretta.")).toBeVisible();

  const corrected = historyRow(page, "84,0 cm");
  await expect(corrected).toContainText("Modificata dal nutrizionista");
  await expectNoHorizontalScroll(page);
});
