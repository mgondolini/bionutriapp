import { createHash, randomBytes } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import {
  OWNER,
  adminClient,
  cleanup,
  login,
  newDevice,
  randomMobile,
} from "./helpers";

/*
 * Preparazione della chiamata di onboarding (v1.0.11, C28–C32, A1, A5,
 * A27): dal link di invito all'attivazione in Onboarding; il cliente manda
 * tutte le misure mensili (errore sotto il campo per un valore fuori dai
 * limiti), carica due foto di partenza, esce e rientra (bozza intatta),
 * completa e salva; la pagina diventa il riepilogo. Il nutrizionista vede
 * tutto nella scheda Profilo (A5), nella scheda Foto (A27) e nell'elenco
 * clienti (A1). Con l'API diretta il cliente in Onboarding non scrive altro.
 */

const STUDIO_ID = "aaaaaaaa-1111-4000-8000-000000000000";
const PASSWORD = "Preparazione-2026!";
const run = Date.now().toString(36);
const mobile = randomMobile();
const person = { firstName: "Sofia", lastName: `Prep${run}` };
const email = `prep.${run}@example.test`;
let clientId = "";
let token = "";

test.describe.configure({ mode: "serial" });

function day(offset: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

test.beforeAll(async () => {
  const admin = adminClient();
  // cliente nuovo (Onboarding) con un invito di cui conosciamo il link
  const { data: client, error } = await admin
    .from("clients")
    .insert({
      studio_id: STUDIO_ID,
      first_name: person.firstName,
      last_name: person.lastName,
      phone: mobile.e164,
      origin: "new",
    })
    .select("id")
    .single();
  if (error) throw error;
  clientId = client.id;
  token = randomBytes(32).toString("base64url");
  const { error: inviteError } = await admin.from("client_invites").insert({
    studio_id: STUDIO_ID,
    client_id: clientId,
    token_hash: createHash("sha256").update(token).digest("hex"),
  });
  if (inviteError) throw inviteError;
  // percorso di 6 mesi con la chiamata di onboarding fra 3 giorni
  const start = day(3);
  const end = new Date(`${start}T12:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 6);
  const { error: journeyError } = await admin.rpc("create_client_journey", {
    p_client_id: clientId,
    p_previous_journey_id: null as unknown as string,
    p_kind: "first",
    p_duration_months: 6,
    p_start_date: start,
    p_end_date: end.toISOString().slice(0, 10),
    p_include_onboarding: true,
    p_gift_mode: "none",
    p_sessions: Array.from({ length: 6 }, (_, position) => ({
      position,
      type: position === 0 ? "onboarding" : "check",
      calculated_date: day(3 + position * 30),
    })),
  });
  if (journeyError) throw journeyError;
  const { error: timeError } = await admin
    .from("journey_sessions")
    .update({ session_time: "18:00" })
    .eq("client_id", clientId)
    .eq("type", "onboarding");
  if (timeError) throw timeError;
});

test.afterAll(async () => {
  const admin = adminClient();
  const { data } = await admin
    .from("photos")
    .select("storage_path")
    .eq("client_id", clientId);
  await cleanup([mobile.e164]);
  const paths = (data ?? []).map((row) => row.storage_path);
  if (paths.length) await admin.storage.from("client-photos").remove(paths);
});

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("nextjs-portal")
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

/** Foto di prova: JPEG disegnato dal browser. */
async function addPhoto(page: Page, view: string, color: string) {
  const dataUrl = await page.evaluate((fill) => {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 400;
    const context = canvas.getContext("2d")!;
    context.fillStyle = fill;
    context.fillRect(0, 0, 300, 400);
    return canvas.toDataURL("image/jpeg", 0.9);
  }, color);
  await page.getByRole("button", { name: `Aggiungi foto ${view}` }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /Scegli dalla libreria/ }).click();
  await (
    await chooser
  ).setFiles({
    name: `${view}.jpg`,
    mimeType: "image/jpeg",
    buffer: Buffer.from(dataUrl.split(",")[1]!, "base64"),
  });
  await expect(page.getByText(`Foto ${view} caricata`)).toBeAttached({
    timeout: 20_000,
  });
}

test("il cliente si attiva, manda misure e foto di partenza e vede il riepilogo", async ({
  browser,
}) => {
  const device = await newDevice(browser);
  const page = device.page;

  // attivazione dal link (C2)
  await page.goto(`/attiva/${token}`);
  await page.getByLabel("Altezza (cm)").fill("170");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page
    .getByRole("checkbox", { name: "Ho letto l'informativa privacy" })
    .check();
  await page
    .getByRole("checkbox", { name: /Acconsento al trattamento/ })
    .check();
  await page.getByRole("button", { name: "Attiva il mio account" }).click();
  await expect(page).toHaveURL(/\/app$/);

  // home (C4): card con 0 di 2 e data della chiamata nei prossimi passi
  const card = page.getByRole("region", { name: "Prepara la chiamata" });
  await expect(card.getByText("0 di 2")).toBeVisible();
  await expect(card.getByText(/^Mandale entro /)).toBeVisible();
  await expect(page.getByText(/, ore 18:00$/)).toBeVisible();
  // in Onboarding niente voce Foto e niente Tracking
  await page.goto("/app/foto");
  await expect(page).toHaveURL(/\/app\/prepara$/);
  await page.goto("/app/tracking");
  await expect(page).toHaveURL(/\/app$/);

  await page.getByRole("link", { name: "Continua a prepararti" }).click();
  await expect(page).toHaveURL(/\/app\/prepara$/);
  await expect(page.getByText("0 di 2 inviate")).toBeVisible();
  await expectAccessible(page);

  // misure di partenza (C29): tutte le misure mensili
  await page.getByRole("link", { name: "Manda le misure" }).click();
  await expect(page).toHaveURL(/\/app\/prepara\/misure$/);
  const values: Record<string, string> = {
    Peso: "68,5",
    "Circ. Spalle": "102",
    "Circ. Vita": "84,0",
    "Circ. Ombelicale": "90,5",
    "Circ. Fianchi": "104",
    "Circ. Gamba dx": "5",
    "Circ. Braccio dx": "29,5",
  };
  for (const [label, value] of Object.entries(values)) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByRole("button", { name: "Invia le misure" }).click();
  const leg = page.getByLabel("Circ. Gamba dx", { exact: true });
  await expect(leg).toHaveAttribute("aria-invalid", "true");
  await expect(
    page.getByText("Il valore deve essere tra 10 e 150 cm."),
  ).toBeVisible();
  await leg.fill("58");
  await page.getByRole("button", { name: "Invia le misure" }).click();
  await expect(page).toHaveURL(/\/app\/prepara$/);
  await expect(page.getByText("1 di 2 inviate")).toBeVisible();

  // foto di partenza (C30): due foto, esce e rientra, la bozza è intatta
  await page.getByRole("link", { name: "Carica le foto" }).click();
  await expect(
    page.getByRole("heading", { name: "Foto di partenza" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await addPhoto(page, "Fronte", "#c96");
  await addPhoto(page, "Lato", "#9c6");
  await expect(
    page.getByRole("button", { name: "Salva le foto" }),
  ).toBeDisabled();

  await page.context().clearCookies();
  await login(page, email, PASSWORD);
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText("Bozza · 2 di 3")).toBeVisible();
  await page.goto("/app/prepara/foto");
  await expect(page.getByText(/^Caricata oggi/)).toHaveCount(2);
  await page.waitForLoadState("networkidle");
  await addPhoto(page, "Dietro", "#69c");
  await page.getByRole("button", { name: "Salva le foto" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(
    dialog.getByRole("button", { name: "Torna alle foto" }),
  ).toBeFocused();
  await dialog.getByRole("button", { name: "Salva definitivamente" }).click();
  await expect(page.getByText("Foto salvate", { exact: true })).toBeVisible();

  // riepilogo (C31)
  await page.goto("/app/prepara");
  await expect(page.getByText("Tutto pronto")).toBeVisible();
  await expect(page.getByText("2 di 2 inviate")).toBeVisible();
  await expect(page.getByText("58,0 cm")).toBeVisible();
  await expect(
    page.getByText("Salvate e bloccate: non si possono più modificare."),
  ).toBeVisible();
  await expectAccessible(page);

  // API diretta: in Onboarding nessuna abitudine, nessun altro set
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  await supabase.auth.signInWithPassword({ email, password: PASSWORD });
  const { data: water } = await adminClient()
    .from("metrics")
    .select("id")
    .eq("studio_id", STUDIO_ID)
    .eq("key", "water")
    .single();
  const { error: habitError } = await supabase.from("tracking_entries").insert({
    client_id: clientId,
    studio_id: STUDIO_ID,
    metric_id: water!.id,
    value: 3,
    recorded_on: day(0),
  });
  expect(habitError?.code).toBe("42501");
  await device.context.close();
});

test("il nutrizionista vede la preparazione in Profilo, Foto ed elenco clienti", async ({
  page,
}) => {
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);

  // A1: chip sotto la fase
  await page.goto(`/admin/clienti?q=${encodeURIComponent(person.lastName)}`);
  await expect(page.getByText("Pronti").first()).toBeVisible();

  // A5: card con misure ricevute e data della chiamata modificabile
  await page.goto(`/admin/clienti/${clientId}/profilo`);
  const card = page.getByRole("region", {
    name: "Preparazione della chiamata",
  });
  await expect(card.getByText("Pronta")).toBeVisible();
  await expect(card.getByText("58,0 cm")).toBeVisible();
  await expect(card.getByText(/, ore 18:00/)).toBeVisible();
  await card.getByRole("button", { name: "Modifica" }).click();
  const dialog = page.getByRole("dialog", { name: "Data della chiamata" });
  await dialog.getByLabel(/^Ora/).fill("17:30");
  await dialog.getByRole("button", { name: "Salva" }).click();
  await expect(card.getByText(/, ore 17:30/)).toBeVisible();

  // A27: banner delle foto di partenza
  await card.getByRole("link", { name: "Apri le foto" }).click();
  await expect(page.getByText("Foto di partenza ricevute.")).toBeVisible();
  await expect(
    page.getByText(new RegExp(`${person.firstName} le ha salvate il `)),
  ).toBeVisible();
});
