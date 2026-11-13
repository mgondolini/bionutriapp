import AxeBuilder from "@axe-core/playwright";
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
 * Foto di avanzamento: il cliente carica due foto, esce e rientra (bozza
 * intatta), aggiunge la terza, conferma e non vede più i comandi; il
 * nutrizionista completa e salva la bozza di un altro cliente; dopo il
 * salvataggio nessuno dei due modifica, nemmeno con l'API diretta. Le foto
 * di prova hanno un blocco EXIF: nel bucket arrivano senza.
 */

const PASSWORD = "Foto-avanzamento-2026!";
const phones: string[] = [];
type TestClient = { clientId: string; email: string; userId: string };
let giulia: TestClient;
let marta: TestClient;
let lucia: TestClient;

test.describe.configure({ mode: "serial" });

/** Percorso di 1 anno iniziato 100 giorni fa: check 3 dieci giorni fa, check 6 fra 80. */
async function createJourney(clientId: string, startOffset = -100) {
  const admin = adminClient();
  const day = (offset: number) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  };
  const start = day(startOffset);
  const end = new Date(`${start}T12:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 12);
  const { error } = await admin.rpc("create_client_journey", {
    p_client_id: clientId,
    p_previous_journey_id: null as unknown as string,
    p_kind: "first",
    p_duration_months: 12,
    p_start_date: start,
    p_end_date: end.toISOString().slice(0, 10),
    p_include_onboarding: true,
    p_gift_mode: "none",
    p_sessions: Array.from({ length: 12 }, (_, position) => ({
      position,
      type: position === 0 ? "onboarding" : "check",
      calculated_date: day(startOffset + position * 30),
    })),
  });
  if (error) throw error;
}

async function newClient(
  firstName: string,
  startOffset = -100,
): Promise<TestClient> {
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const email = `foto.${suffix}@example.test`;
  const created = await createActiveClient({
    firstName,
    lastName: `Foto${suffix}`,
    password: PASSWORD,
    email,
  });
  phones.push(created.phone.e164);
  await createJourney(created.clientId, startOffset);
  return { clientId: created.clientId, email, userId: created.userId };
}

test.beforeAll(async () => {
  giulia = await newClient("Giulia");
  marta = await newClient("Marta");
  // in Onboarding, con l'onboarding fra 2 giorni: il set di partenza è aperto
  lucia = await newClient("Lucia", 2);
  const { error } = await adminClient()
    .from("clients")
    .update({ journey_stage: "onboarding" })
    .eq("id", lucia.clientId);
  if (error) throw error;
});

test.afterAll(async () => {
  const admin = adminClient();
  const { data } = await admin
    .from("photos")
    .select("storage_path")
    .in("client_id", [giulia.clientId, marta.clientId, lucia.clientId]);
  await cleanup(phones);
  const paths = (data ?? []).map((row) => row.storage_path);
  if (paths.length) await admin.storage.from("client-photos").remove(paths);
});

/** Nessuna violazione WCAG 2.1 A/AA sulla pagina così com'è (bozza con foto). */
async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .exclude("nextjs-portal")
    .analyze();
  expect(results.violations.map((v) => v.id)).toEqual([]);
}

/** JPEG di prova disegnato dal browser, con un blocco EXIF aggiunto a mano. */
async function jpegWithExif(page: Page, color: string): Promise<Buffer> {
  const dataUrl = await page.evaluate((fill) => {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 400;
    const context = canvas.getContext("2d")!;
    context.fillStyle = fill;
    context.fillRect(0, 0, 300, 400);
    return canvas.toDataURL("image/jpeg", 0.9);
  }, color);
  const jpeg = Buffer.from(dataUrl.split(",")[1]!, "base64");
  const tiff = Buffer.from([
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00,
  ]);
  const body = Buffer.concat([Buffer.from("Exif\0\0", "binary"), tiff]);
  const length = Buffer.from([
    (body.length + 2) >> 8,
    (body.length + 2) & 0xff,
  ]);
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), length, body]);
  return Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]);
}

/** Cliente: "Aggiungi foto <vista>" → "Scegli dalla libreria" → file. */
async function clientAdd(page: Page, view: string, color: string) {
  const buffer = await jpegWithExif(page, color);
  await page.getByRole("button", { name: `Aggiungi foto ${view}` }).click();
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /Scegli dalla libreria/ }).click();
  await (
    await chooser
  ).setFiles({
    name: `${view}.jpg`,
    mimeType: "image/jpeg",
    buffer,
  });
  await expect(page.getByText(`Foto ${view} caricata`)).toBeAttached({
    timeout: 20_000,
  });
}

async function clientSession(email: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (error) throw error;
  return supabase;
}

test("il cliente carica due foto, rientra, aggiunge la terza e salva", async ({
  page,
}) => {
  await login(page, giulia.email, PASSWORD);
  await expect(page).toHaveURL(/\/app$/);
  // card in home il giorno del check, voce del menu con il badge
  await page.getByRole("link", { name: /Carica le foto del Check 3/ }).click();
  await expect(
    page.getByRole("heading", { name: "Foto · Check 3" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");

  await clientAdd(page, "Fronte", "#c96");
  await clientAdd(page, "Lato", "#9c6");
  await expect(
    page.getByRole("button", { name: "Salva le foto" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Aggiungi la foto mancante per poter salvare."),
  ).toBeVisible();

  // esce e rientra: la bozza è intatta
  await page.context().clearCookies();
  await login(page, giulia.email, PASSWORD);
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/app/foto");
  await expect(
    page.getByText("2 di 3 caricate · bozza non ancora salvata"),
  ).toBeVisible();
  await page.getByRole("link", { name: "Continua a caricare" }).click();
  await expect(page.getByText(/^Caricata oggi/)).toHaveCount(2);
  await expectAccessible(page);

  // nel bucket il JPEG non ha più l'EXIF
  const admin = adminClient();
  const { data: rows } = await admin
    .from("photos")
    .select("storage_path")
    .eq("client_id", giulia.clientId);
  const { data: blob } = await admin.storage
    .from("client-photos")
    .download(rows![0]!.storage_path);
  const bytes = Buffer.from(await blob!.arrayBuffer());
  expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));
  expect(bytes.includes(Buffer.from("Exif\0\0", "binary"))).toBe(false);

  await page.waitForLoadState("networkidle");
  await clientAdd(page, "Dietro", "#69c");
  await page.getByRole("button", { name: "Salva le foto" }).click();
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Torna alle foto" }),
  ).toBeFocused();
  await dialog.getByRole("button", { name: "Salva definitivamente" }).click();
  await expect(page.getByText("Foto salvate", { exact: true })).toBeVisible();

  await expect(page.getByText(/Foto salvate il /)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Sostituisci|Elimina|Aggiungi/ }),
  ).toHaveCount(0);
  await page.goto("/app/foto");
  await expect(
    page.getByRole("heading", { name: "Foto salvate" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Carica le foto del Check 3/ }),
  ).toHaveCount(0);
});

test("il nutrizionista completa e salva la bozza di un cliente", async ({
  page,
  browser,
}) => {
  // Marta carica solo la foto di fronte
  const device = await newDevice(browser);
  await login(device.page, marta.email, PASSWORD);
  await expect(device.page).toHaveURL(/\/app$/);
  await device.page.goto("/app/foto");
  // il primo set è il più recente (check 3); sotto quello di partenza
  await device.page
    .getByRole("link", { name: "Carica le foto" })
    .first()
    .click();
  await device.page.waitForLoadState("networkidle");
  await clientAdd(device.page, "Fronte", "#c96");
  await device.context.close();

  await login(page, OWNER.email, OWNER.password);
  await page.waitForURL(/\/admin/);
  await page.goto(`/admin/clienti/${marta.clientId}/foto`);
  await expect(
    page.getByRole("link", { name: /Foto.*2 da completare/ }),
  ).toBeVisible();
  await expect(page.getByText("Bozza · 1 di 3")).toBeVisible();
  await expect(page.getByText(/Caricata da Marta/).first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expectAccessible(page);

  await page.getByRole("button", { name: "Aggiungi le foto mancanti" }).click();
  const dialog = page.getByRole("dialog", { name: /Foto del Check 3/ });
  await expect(
    dialog.getByRole("button", { name: "Salva le foto" }),
  ).toBeDisabled();
  for (const [view, color] of [
    ["Lato", "#9c6"],
    ["Dietro", "#69c"],
  ] as const) {
    const buffer = await jpegWithExif(page, color);
    const chooser = page.waitForEvent("filechooser");
    await dialog
      .getByRole("button", { name: `Scegli un file per la foto ${view}` })
      .click();
    await (
      await chooser
    ).setFiles({ name: `${view}.jpg`, mimeType: "image/jpeg", buffer });
    await expect(page.getByText(`Foto ${view} caricata`).first()).toBeAttached({
      timeout: 20_000,
    });
  }
  await expect(dialog.getByText(/Caricata dallo studio/)).toHaveCount(2);
  await dialog.getByRole("button", { name: "Salva le foto" }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(
    confirm.getByRole("button", { name: "Torna alle foto" }),
  ).toBeFocused();
  await confirm.getByRole("button", { name: "Salva definitivamente" }).click();
  await expect(page.getByText("Foto salvate", { exact: true })).toBeVisible();

  await expect(page.getByText(/Salvate dallo studio il /)).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Sostituisci|Elimina/ }),
  ).toHaveCount(0);
  // resta da completare solo il set di partenza
  await expect(
    page.getByRole("link", { name: /Foto.*1 da completare/ }),
  ).toBeVisible();

  // a schermo intero: frecce ed Esc
  await page.getByRole("button", { name: "Apri a schermo intero" }).click();
  const viewer = page.getByRole("dialog", { name: "Check 3 · Fronte" });
  await expect(viewer).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("dialog", { name: "Check 3 · Lato" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("dopo il salvataggio né il cliente né lo staff modificano, nemmeno con l'API", async () => {
  const client = await clientSession(giulia.email);
  const { data: photos } = await client
    .from("photos")
    .select("id, storage_path")
    .eq("client_id", giulia.clientId);
  expect(photos).toHaveLength(3);
  const { error: updateError } = await client
    .from("photos")
    .update({ size_bytes: 1 })
    .eq("id", photos![0]!.id);
  expect(updateError?.code).toBe("23514");
  const { error: deleteError } = await client
    .from("photos")
    .delete()
    .eq("id", photos![0]!.id);
  expect(deleteError?.code).toBe("23514");
  const { data: removed } = await client.storage
    .from("client-photos")
    .remove([photos![0]!.storage_path]);
  expect(removed ?? []).toHaveLength(0);

  // un cliente non legge le foto di un altro
  const { data: others } = await client
    .from("photos")
    .select("id")
    .eq("client_id", marta.clientId);
  expect(others).toEqual([]);

  const staff = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  await staff.auth.signInWithPassword({
    email: OWNER.email,
    password: OWNER.password,
  });
  const { error: staffError } = await staff
    .from("photo_sets")
    .update({ status: "draft" })
    .eq("client_id", marta.clientId);
  expect(staffError?.code).toBe("23514");
  const { error: staffDelete } = await staff
    .from("photos")
    .delete()
    .eq("client_id", marta.clientId);
  expect(staffDelete?.code).toBe("23514");
});

test("in Onboarding il cliente carica le foto di partenza da 3 giorni prima", async ({
  page,
}) => {
  await login(page, lucia.email, PASSWORD);
  await expect(page).toHaveURL(/\/app$/);
  await page.getByRole("link", { name: /Carica le foto di partenza/ }).click();
  await expect(
    page.getByRole("heading", { name: "Foto · Onboarding" }),
  ).toBeVisible();
  await page.waitForLoadState("networkidle");
  await clientAdd(page, "Fronte", "#c96");
  await expect(page.getByText(/^Caricata oggi/)).toHaveCount(1);
  // il tracking resta bloccato in Onboarding
  await page.goto("/app/tracking");
  await expect(page).toHaveURL(/\/app$/);
});

test("smartphone a 390 px: elenco e set senza scorrimento orizzontale", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: "it-IT",
  });
  const page = await context.newPage();
  await login(page, giulia.email, PASSWORD);
  await expect(page).toHaveURL(/\/app$/);
  for (const path of ["/app/foto"]) {
    await page.goto(path);
    await expect(
      page.getByRole("heading", { name: "Le tue foto" }),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  }
  await page.getByRole("link", { name: /Check 3/ }).click();
  await expect(page.getByRole("group", { name: "Vista" })).toBeVisible();
  await page.getByRole("button", { name: "Lato" }).click();
  await expect(
    page.getByRole("img", { name: /Foto lato, Check 3/ }),
  ).toBeVisible();
  await context.close();
});
