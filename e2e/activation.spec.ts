import { expect, test, type Page } from "@playwright/test";

import {
  adminClient,
  cleanup,
  inviteLinkFrom,
  login,
  newDevice,
  OWNER,
  randomMobile,
  tokenHash,
} from "./helpers";

/*
 * Flusso critico "attivazione dal link" (DEV-18): invito su WhatsApp,
 * apertura del link, attivazione, accesso e fase corretta, per un cliente
 * già nel database (C1) e per un cliente nuovo (C2).
 */

const run = Date.now().toString(36);
const imported = {
  firstName: "Ilaria",
  lastName: `Prova${run}`,
  ...randomMobile(),
};
const fresh = {
  firstName: `Nuovo${run}`,
  lastName: "Cliente",
  ...randomMobile(),
};
const PASSWORD = "passwordE2E!";
const INVALID =
  "Link non valido o scaduto: chiedi un nuovo invito allo studio.";

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  // WhatsApp non viene mai aperto davvero
  await context.route("https://wa.me/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<p>WhatsApp</p>" }),
  );
});

test.afterAll(async () => {
  await cleanup([imported.e164, fresh.e164]);
});

async function createClient(
  page: Page,
  mode: "Nuovo cliente" | "Con dati completi",
  client: { firstName: string; lastName: string; typed: string },
) {
  await page.goto("/admin/clienti");
  await page.getByRole("button", { name: "Nuovo cliente" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: mode }).check();
  await dialog
    .getByRole("textbox", { name: "Nome", exact: true })
    .fill(client.firstName);
  if (mode === "Con dati completi") {
    await dialog
      .getByRole("textbox", { name: "Cognome", exact: true })
      .fill(client.lastName);
  }
  await dialog.getByRole("textbox", { name: "Cellulare" }).fill(client.typed);
  await dialog.getByRole("button", { name: "Crea cliente" }).click();
  await expect(dialog).toBeHidden();
}

async function openProfile(page: Page, search: string, name: string) {
  await page.goto(`/admin/clienti?q=${encodeURIComponent(search)}`);
  await page
    .getByRole("link", { name: `Dettaglio di ${name}` })
    .first()
    .click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

test("cliente già nel database: invito, link scaduto, nuovo invito, attivazione In percorso", async ({
  page,
  browser,
}) => {
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await createClient(page, "Con dati completi", imported);

  // Invito dalla riga della tabella (N-01)
  const name = `${imported.firstName} ${imported.lastName}`;
  await page.goto(`/admin/clienti?q=${encodeURIComponent(imported.lastName)}`);
  const first = await inviteLinkFrom(page, () =>
    page
      .getByRole("button", { name: `Invia invito su WhatsApp a ${name}` })
      .click(),
  );
  expect(first.phoneDigits).toBe(imported.e164.slice(1));
  expect(first.text).toBe(
    `Ciao! ${OWNER.studioName} ti invita ad attivare il tuo account: ${first.link}`,
  );
  // la riga si aggiorna senza ricaricare: ora c'è "Reinvia invito"
  await expect(
    page.getByRole("button", { name: `Invia invito su WhatsApp a ${name}` }),
  ).toContainText("Reinvia invito");

  // Link oltre i 14 giorni → messaggio generico
  await adminClient()
    .from("client_invites")
    .update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
    .eq("token_hash", tokenHash(first.link));
  const device = await newDevice(browser);
  await device.page.goto(first.link);
  await expect(device.page.getByText(INVALID)).toBeVisible();

  // Nuovo invito dalla scheda Profilo (invito scaduto)
  await openProfile(page, imported.lastName, name);
  await expect(page.getByText(/Invito scaduto il/)).toBeVisible();
  const second = await inviteLinkFrom(page, () =>
    page.getByRole("button", { name: "Reinvia invito su WhatsApp" }).click(),
  );

  // C1: dati precompilati da verificare, poi password
  const response = await device.page.goto(second.link);
  await expect(
    device.page.getByRole("button", { name: "Attiva il mio account" }),
  ).toBeEnabled();
  expect(response?.headers()["referrer-policy"]).toBe("no-referrer");
  expect(response?.headers()["x-robots-tag"]).toContain("noindex");
  await expect(
    device.page.getByText(/lo studio ha già inserito i tuoi dati/),
  ).toBeVisible();
  await expect(device.page.getByLabel("Nome", { exact: true })).toHaveValue(
    imported.firstName,
  );
  await expect(device.page.getByLabel("Cognome", { exact: true })).toHaveValue(
    imported.lastName,
  );
  await expect(
    device.page.getByText(/Numero verificato: \+39 345/),
  ).toBeVisible();
  await device.page
    .getByLabel("Email (facoltativa)")
    .fill(`ilaria.${run}@example.test`);
  await device.page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await device.page.getByRole("checkbox").check();
  await device.page
    .getByRole("button", { name: "Attiva il mio account" })
    .click();

  // Accesso a /app In percorso: sezioni sbloccate
  await expect(device.page).toHaveURL(/\/app$/);
  await expect(
    device.page.getByRole("heading", { name: "Home" }),
  ).toBeVisible();
  await device.page.goto("/app/diete");
  await expect(device.page).toHaveURL(/\/app\/diete$/);

  // Link già usato → messaggio generico
  await device.page.goto(second.link);
  await expect(device.page.getByText(INVALID)).toBeVisible();

  // Scheda: Attivo, In percorso, nessun cambio di fase all'attivazione
  await page.reload();
  await expect(page.getByText("Attivo dal")).toBeVisible();
  await device.context.close();
});

test("cliente nuovo: il secondo invito annulla il primo, attivazione in Onboarding, login con cellulare, storico e disattivazione", async ({
  page,
  browser,
}) => {
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await createClient(page, "Nuovo cliente", fresh);
  await openProfile(page, fresh.firstName, fresh.firstName);

  // A6: anteprima del messaggio con solo nome dello studio e link
  await expect(
    page.getByText(
      `Ciao! ${OWNER.studioName} ti invita ad attivare il tuo account: [link personale]`,
    ),
  ).toBeVisible();
  await expect(page.getByText("Non ancora assegnata")).toBeVisible();

  const first = await inviteLinkFrom(page, () =>
    page.getByRole("button", { name: "Invia invito su WhatsApp" }).click(),
  );
  const second = await inviteLinkFrom(page, () =>
    page.getByRole("button", { name: "Reinvia invito su WhatsApp" }).click(),
  );
  expect(second.link).not.toBe(first.link);

  const device = await newDevice(browser);
  await device.page.goto(first.link);
  await expect(device.page.getByText(INVALID)).toBeVisible();

  // C2: modulo da compilare, nessuna email
  await device.page.goto(second.link);
  await expect(
    device.page.getByRole("button", { name: "Attiva il mio account" }),
  ).toBeEnabled();
  await expect(
    device.page.getByText(`Ti diamo il benvenuto in ${OWNER.studioName}`),
  ).toBeVisible();
  await device.page.getByLabel("Cognome", { exact: true }).fill(fresh.lastName);
  await device.page.getByLabel("Password", { exact: true }).fill("corta");
  await device.page
    .getByRole("button", { name: "Attiva il mio account" })
    .click();
  await expect(
    device.page.getByText("La password deve avere almeno 8 caratteri."),
  ).toBeVisible();
  await expect(
    device.page.getByText("Per attivare l'account serve il consenso."),
  ).toBeVisible();
  await device.page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await device.page.getByRole("checkbox").check();
  await device.page
    .getByRole("button", { name: "Attiva il mio account" })
    .click();

  // Onboarding (C4): benvenuto, sezioni bloccate
  await expect(device.page).toHaveURL(/\/app$/);
  await expect(
    device.page.getByRole("heading", {
      name: `Il tuo percorso con ${OWNER.studioName} inizia con una chiamata`,
    }),
  ).toBeVisible();
  await device.page.goto("/app/diete");
  await expect(device.page).toHaveURL(/\/app$/);
  await device.context.close();

  // Senza email: entra con cellulare e password
  const phoneDevice = await newDevice(browser);
  await login(phoneDevice.page, fresh.typed, PASSWORD);
  await expect(phoneDevice.page).toHaveURL(/\/app$/);

  // Staff: "Onboarding completato" → storico con autore e data
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Onboarding completato" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Onboarding completato" }).click();
  const history = page.getByRole("region", { name: "Storico del percorso" });
  await expect(
    history
      .getByRole("listitem")
      .filter({ hasText: "Onboarding → In percorso" }),
  ).toContainText(
    new RegExp(
      `\\d{1,2} \\w{3} \\d{4}, \\d{2}:\\d{2} · Manuale, ${OWNER.displayName}`,
    ),
  );
  await expect(history.getByText("Creazione → Onboarding")).toBeVisible();
  await page.getByRole("button", { name: "Metti in pausa" }).click();
  await expect(page.getByText("In percorso → In pausa")).toBeVisible();
  await page.getByRole("button", { name: "Riprendi percorso" }).click();
  await expect(page.getByText("In pausa → In percorso")).toBeVisible();

  // Il cliente (sessione aperta) vede le sezioni sbloccate
  await phoneDevice.page.goto("/app/diete");
  await expect(phoneDevice.page).toHaveURL(/\/app\/diete$/);

  // Disattivazione con conferma: la sessione aperta viene espulsa
  await page.getByRole("button", { name: "Disattiva account" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Disattiva account" })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Riattiva account" }),
  ).toBeVisible();
  await phoneDevice.page.goto("/app");
  await expect(phoneDevice.page).toHaveURL(/\/accesso-sospeso$/);

  // e non può più entrare
  const blocked = await newDevice(browser);
  await login(blocked.page, fresh.typed, PASSWORD);
  await expect(
    blocked.page.getByText("Credenziali non corrette."),
  ).toBeVisible();

  // Riattivazione: torna ad accedere
  await page.getByRole("button", { name: "Riattiva account" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Riattiva account" })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Disattiva account" }),
  ).toBeVisible();
  await login(blocked.page, fresh.typed, PASSWORD);
  await expect(blocked.page).toHaveURL(/\/app/);

  await phoneDevice.context.close();
  await blocked.context.close();
});
