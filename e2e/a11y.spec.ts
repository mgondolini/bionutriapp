import { randomBytes } from "node:crypto";

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import {
  adminClient,
  cleanup,
  login,
  newDevice,
  OWNER,
  randomMobile,
  tokenHash,
} from "./helpers";

/*
 * Accessibilità (NF-09): controlli automatici con axe (WCAG 2.1 A e AA) sulle
 * schermate principali di entrambe le aree, ripetuti con il colore del seed,
 * uno scuro e uno chiaro (il colore dello studio cambia --primary e il testo
 * sopra di esso). Poi navigazione da tastiera e focus visibile.
 */

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];
const SEED_COLOR = "#2E6A4E";
const COLORS = [
  { name: "colore del seed", hex: SEED_COLOR },
  { name: "colore scuro", hex: "#1F2A44" },
  { name: "colore chiaro", hex: "#F2C94C" },
];
const ANNA = { email: "anna.rossi@example.test", password: "password123" };
const ANNA_ID = "aaaaaaaa-2222-4000-8000-000000000001";

const PUBLIC_PAGES = [
  "/login",
  "/recupera-password",
  "/nuova-password?token_hash=a11y&type=recovery",
  "/privacy",
  "/attiva/link-non-valido-per-il-test-di-accessibilita-000",
  "/offline.html",
];
const ADMIN_PAGES = [
  "/admin/clienti",
  `/admin/clienti/${ANNA_ID}/profilo`,
  `/admin/clienti/${ANNA_ID}/file`,
  `/admin/clienti/${ANNA_ID}/tracking`,
  `/admin/clienti/${ANNA_ID}/tracking/water`,
  "/admin/impostazioni",
  "/admin/profilo",
];
const CLIENT_PAGES = [
  "/app",
  "/app/diete",
  "/app/tracking",
  "/app/tracking/check-in",
  "/app/tracking/water",
  "/app/tracking/circ_waist",
  "/app/profilo",
  "/app/installa",
];

async function expectNoViolations(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  // nessuno scheletro di caricamento ancora a schermo
  await expect(page.locator("[data-slot=skeleton]")).toHaveCount(0);
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const summary = results.violations.map((violation) => ({
    rule: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.slice(0, 3).map((node) => node.target.join(" ")),
  }));
  expect.soft(summary, `violazioni axe su ${path}`).toEqual([]);
}

/** Colore dello studio dalle impostazioni (come il titolare: invalida anche la cache del branding). */
async function setStudioColor(page: Page, hex: string) {
  await page.goto("/admin/impostazioni");
  const input = page.locator("#studio-color");
  await expect(
    page.getByRole("button", { name: "Salva impostazioni" }),
  ).toBeEnabled();
  await input.fill(hex);
  await page.getByRole("button", { name: "Salva impostazioni" }).click();
  await expect(page.getByText("Impostazioni salvate.")).toBeVisible();
}

test.describe.configure({ mode: "serial" });

// Link di attivazione valido (pagina C1), creato e poi eliminato
const invited = {
  ...randomMobile(),
  token: randomBytes(32).toString("base64url"),
};

test.beforeAll(async () => {
  const admin = adminClient();
  const { data: client, error } = await admin
    .from("clients")
    .insert({
      studio_id: "aaaaaaaa-1111-4000-8000-000000000000",
      first_name: "Accessibile",
      last_name: "Prova",
      phone: invited.e164,
      origin: "imported",
    })
    .select("id")
    .single();
  if (error) throw error;
  const { error: inviteError } = await admin.from("client_invites").insert({
    client_id: client.id,
    token_hash: tokenHash(`http://x/attiva/${invited.token}`),
  });
  if (inviteError) throw inviteError;
});

test.afterAll(async ({ browser }) => {
  await cleanup([invited.e164]);
  // il colore torna quello del seed anche se un test è fallito
  const owner = await newDevice(browser);
  await login(owner.page, OWNER.email, OWNER.password);
  await expect(owner.page).toHaveURL(/\/admin/);
  await setStudioColor(owner.page, SEED_COLOR);
  await owner.context.close();
});

for (const color of COLORS) {
  test(`axe, ${color.name} (${color.hex}): pagine pubbliche, area admin e area cliente`, async ({
    page,
    browser,
  }) => {
    test.setTimeout(240_000);
    await login(page, OWNER.email, OWNER.password);
    await expect(page).toHaveURL(/\/admin/);
    await setStudioColor(page, color.hex);

    for (const path of ADMIN_PAGES) await expectNoViolations(page, path);

    const anonymous = await newDevice(browser);
    for (const path of [...PUBLIC_PAGES, `/attiva/${invited.token}`]) {
      await expectNoViolations(anonymous.page, path);
    }
    await anonymous.context.close();

    const client = await newDevice(browser);
    await login(client.page, ANNA.email, ANNA.password);
    await expect(client.page).toHaveURL(/\/app/);
    for (const path of CLIENT_PAGES)
      await expectNoViolations(client.page, path);
    await client.context.close();
  });
}

/** Il focus è visibile: anello (box-shadow) o contorno non nulli. */
async function expectVisibleFocus(page: Page) {
  const style = await page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element || element === document.body) return null;
    const computed = getComputedStyle(element);
    return {
      element: element.outerHTML.slice(0, 160),
      outline:
        computed.outlineStyle !== "none" && computed.outlineWidth !== "0px",
      ring: computed.boxShadow !== "none",
    };
  });
  expect(style, "nessun elemento con il focus").not.toBeNull();
  expect(
    style!.outline || style!.ring,
    `focus non visibile: ${style!.element}`,
  ).toBe(true);
}

test("tastiera: link Vai al contenuto, menu e dialog dell'area cliente", async ({
  page,
}) => {
  await login(page, ANNA.email, ANNA.password);
  await expect(page).toHaveURL(/\/app/);
  await page.goto("/app/profilo");
  await page.waitForLoadState("networkidle");

  // primo Tab: "Vai al contenuto", visibile, porta al contenuto principale
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Vai al contenuto" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await expectVisibleFocus(page);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#contenuto$/);

  // dialog "Esci da tutti i dispositivi": focus dentro, Esc chiude, focus restituito
  const trigger = page.getByRole("button", {
    name: "Esci da tutti i dispositivi",
  });
  await trigger.focus();
  await expectVisibleFocus(page);
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("alertdialog").or(page.getByRole("dialog"));
  await expect(dialog).toBeVisible();
  // il focus entra nel dialog all'apertura, su un pulsante (dopo l'animazione)
  await expect
    .poll(() =>
      dialog.evaluate(
        (node) =>
          node.contains(document.activeElement) &&
          document.activeElement?.tagName === "BUTTON" &&
          !node
            .getAnimations({ subtree: true })
            .some((a) => a.playState === "running"),
      ),
    )
    .toBe(true);
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    // le "guardie" di Base UI riportano il focus dentro subito dopo il tasto
    await expect
      .poll(
        () => dialog.evaluate((node) => node.contains(document.activeElement)),
        { message: "il focus resta nel dialog" },
      )
      .toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("tastiera: tutta la home cliente si attraversa con Tab, con focus sempre visibile", async ({
  page,
}) => {
  await login(page, ANNA.email, ANNA.password);
  await expect(page).toHaveURL(/\/app/);
  await page.waitForLoadState("networkidle");

  const seen = new Set<string>();
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press("Tab");
    const key = await page.evaluate(() => {
      const element = document.activeElement;
      return element && element !== document.body
        ? `${element.tagName}:${element.textContent?.trim().slice(0, 40)}:${element.getAttribute("href") ?? ""}`
        : null;
    });
    if (!key) continue;
    // strumenti di sviluppo di Next (solo in dev): non fanno parte della pagina
    if (key.startsWith("NEXTJS-PORTAL")) continue;
    if (seen.has(key)) break; // giro completo
    seen.add(key);
    await expectVisibleFocus(page);
  }
  expect(seen.size).toBeGreaterThan(3);
});

test("tastiera: menu utente dell'area admin", async ({ page }) => {
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await page.waitForLoadState("networkidle");

  const trigger = page.getByRole("button", {
    name: new RegExp(OWNER.displayName),
  });
  // modalità tastiera: un primo Tab, poi il focus sul menu utente
  await page.keyboard.press("Tab");
  await trigger.focus();
  await expectVisibleFocus(page);
  await page.keyboard.press("Enter");
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await page.keyboard.press("ArrowDown");
  expect(
    await menu.evaluate((node) => node.contains(document.activeElement)),
    "le frecce spostano il focus tra le voci del menu",
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();
  await expect(trigger).toBeFocused();
});
