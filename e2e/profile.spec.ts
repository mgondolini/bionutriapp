import { expect, test, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import {
  adminClient,
  cleanup,
  createActiveClient,
  emailLinkPath,
  login,
  newDevice,
} from "./helpers";

/*
 * Profilo e sessione (fase 7): cambio password con chiusura delle altre
 * sessioni, uscita senza dati visibili con Indietro, "Esci da tutti i
 * dispositivi", email aggiunta e confermata da Mailpit e poi recupero della
 * password; il cliente non cambia cellulare, stato o fase con l'API diretta.
 */

const PASSWORD = "password-profilo-1";
const NEW_PASSWORD = "password-profilo-2";
const stamp = Date.now().toString(36);
const phones: string[] = [];

test.describe.configure({ mode: "serial" });

test.afterAll(async () => {
  await cleanup(phones);
});

const EXPIRED = "La sessione è scaduta, accedi di nuovo.";
const LOGGED_OUT = "Sei uscito dall'app.";

async function expectLoggedOutOf(page: Page, path: string) {
  await page.goto(path);
  await expect(page).toHaveURL(/\/login\?/);
  await expect(page.getByText(EXPIRED)).toBeVisible();
}

test("cambio password: le altre sessioni si chiudono; dopo Esci niente /app né con Indietro", async ({
  page,
  browser,
}) => {
  const email = `profilo.pw.${stamp}@example.test`;
  const client = await createActiveClient({
    firstName: "Paola",
    lastName: "Password",
    password: PASSWORD,
    email,
  });
  phones.push(client.phone.e164);

  // Due dispositivi con la stessa cliente
  await login(page, email, PASSWORD);
  await expect(page).toHaveURL(/\/app$/);
  const other = await newDevice(browser);
  await login(other.page, client.phone.typed, PASSWORD);
  await expect(other.page).toHaveURL(/\/app$/);

  await page.goto("/app/profilo");
  await expect(
    page.getByRole("heading", { name: "Paola Password", level: 1 }),
  ).toBeVisible();

  // Password attuale sbagliata: rifiutata, messaggio generico
  await page.getByRole("button", { name: "Cambia password" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Password attuale", { exact: true })
    .fill("sbagliata-1");
  await dialog.getByLabel("Nuova password", { exact: true }).fill(NEW_PASSWORD);
  await dialog
    .getByLabel("Ripeti la nuova password", { exact: true })
    .fill(NEW_PASSWORD);
  await dialog.getByRole("button", { name: "Salva la password" }).click();
  await expect(
    dialog.getByText(/Non è stato possibile cambiare la password/),
  ).toBeVisible();

  // Password attuale giusta: cambio riuscito, questa sessione resta aperta
  await dialog.getByLabel("Password attuale", { exact: true }).fill(PASSWORD);
  await dialog.getByRole("button", { name: "Salva la password" }).click();
  await expect(page.getByText(/Password aggiornata/)).toBeVisible();
  await expect(dialog).toBeHidden();
  await page.goto("/app");
  await expect(page.getByText("Ciao Paola")).toBeVisible();

  // L'altro dispositivo non funziona più
  await expectLoggedOutOf(other.page, "/app/profilo");
  await other.context.close();

  // Esci (senza conferma): login con "Sei uscito dall'app"
  await page.goto("/app/profilo");
  await page.getByRole("button", { name: "Esci", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?motivo=uscito$/);
  await expect(page.getByText(LOGGED_OUT)).toBeVisible();

  // Indietro e indirizzo diretto: nessun dato della cliente
  await page.goBack();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByText("Ciao Paola")).toHaveCount(0);
  await page.goto("/app/profilo");
  await expect(page).toHaveURL(/\/login\?next=%2Fapp%2Fprofilo$/);
  await expect(page.getByText("Paola Password")).toHaveCount(0);

  // Le pagine autenticate non vanno in cache
  const response = await page.request.get("/app", { maxRedirects: 0 });
  expect(response.headers()["cache-control"]).toContain("no-store");

  // La vecchia password non vale più, la nuova sì
  await login(page, email, PASSWORD);
  await expect(page.getByText("Credenziali non corrette.")).toBeVisible();
  await login(page, email, NEW_PASSWORD);
  await expect(page).toHaveURL(/\/app$/);
});

test("Esci da tutti i dispositivi chiude anche la sessione in un altro contesto", async ({
  page,
  browser,
}) => {
  const email = `profilo.all.${stamp}@example.test`;
  const client = await createActiveClient({
    firstName: "Tina",
    lastName: "Tutti",
    password: PASSWORD,
    email,
  });
  phones.push(client.phone.e164);

  await login(page, email, PASSWORD);
  await expect(page).toHaveURL(/\/app$/);
  const other = await newDevice(browser);
  await login(other.page, email, PASSWORD);
  await expect(other.page).toHaveURL(/\/app$/);
  await other.page.goto("/app/profilo");

  await page.goto("/app/profilo");
  await page
    .getByRole("button", { name: "Esci da tutti i dispositivi" })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText("Uscire da tutti i dispositivi?"),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Esci da tutti" }).click();
  await expect(page).toHaveURL(/\/login\?motivo=uscito$/);

  // Sull'altro dispositivo la pagina è ancora aperta: la prima Server Action
  // risponde "unauthenticated" e l'interfaccia porta al login con il ritorno
  await other.page.getByRole("switch").click();
  await expect(other.page).toHaveURL(
    /\/login\?next=%2Fapp%2Fprofilo&motivo=sessione-scaduta$/,
  );
  await expect(other.page.getByText(EXPIRED)).toBeVisible();
  await expect(other.page.getByText("Tina Tutti")).toHaveCount(0);
  await other.context.close();
});

test("cliente senza email: la aggiunge, la conferma da Mailpit e recupera la password da solo", async ({
  page,
  browser,
}) => {
  const email = `profilo.email.${stamp}@example.test`;
  const client = await createActiveClient({
    firstName: "Elsa",
    lastName: "Email",
    password: PASSWORD,
    email: null,
  });
  phones.push(client.phone.e164);

  // Entra con il cellulare: nessuna email nel profilo
  await login(page, client.phone.typed, PASSWORD);
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/app/profilo");
  await expect(page.getByText("Nessuna email")).toBeVisible();
  await expect(
    page.getByText("Per cambiarlo contatta lo studio."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Aggiungi email" }).click();
  await page.getByLabel("La tua email").fill(email);
  await page.getByRole("button", { name: "Invia il link di conferma" }).click();
  await expect(
    page.getByText(`Ti abbiamo inviato un link a ${email}`, { exact: false }),
  ).toBeVisible();

  // Prima della conferma clients.email non cambia
  const admin = adminClient();
  const readEmail = async () =>
    (
      await admin
        .from("clients")
        .select("email")
        .eq("id", client.clientId)
        .single()
    ).data?.email ?? null;
  expect(await readEmail()).toBeNull();

  // Conferma dal link dell'email (solo al clic su "Conferma")
  const confirmPath = await emailLinkPath(
    email,
    "email_change",
    "/conferma-email",
  );
  const mail = await newDevice(browser);
  await mail.page.goto(confirmPath);
  await mail.page.getByRole("button", { name: "Conferma" }).click();
  await expect(mail.page.getByText(/Email confermata/)).toBeVisible();
  await mail.context.close();
  await expect.poll(readEmail).toBe(email);

  await page.reload();
  await expect(page.getByText(email, { exact: true })).toBeVisible();

  // Recupero della password da solo, con la nuova email
  const recovery = await newDevice(browser);
  await recovery.page.goto("/recupera-password");
  await expect(
    recovery.page.getByRole("button", { name: "Invia il link" }),
  ).toBeEnabled();
  await recovery.page.getByLabel("Email").fill(email);
  await recovery.page.getByRole("button", { name: "Invia il link" }).click();
  await expect(recovery.page.getByText(/riceverai un'email/)).toBeVisible();
  await recovery.page.goto(
    await emailLinkPath(email, "recovery", "/nuova-password"),
  );
  await expect(
    recovery.page.getByRole("button", { name: "Salva la password" }),
  ).toBeEnabled();
  await recovery.page
    .getByLabel("Nuova password", { exact: true })
    .fill(NEW_PASSWORD);
  await recovery.page
    .getByLabel("Ripeti la password", { exact: true })
    .fill(NEW_PASSWORD);
  await recovery.page
    .getByRole("button", { name: "Salva la password" })
    .click();
  await expect(recovery.page).toHaveURL(/\/app$/);
  await recovery.context.close();

  // Con l'API diretta e la sessione della cliente: niente cellulare, stato o fase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email,
    password: NEW_PASSWORD,
  });
  expect(loginError).toBeNull();
  for (const change of [
    { phone: "+393339999999" },
    { account_status: "disabled" },
    { journey_stage: "completed" },
    { email: "altra@example.test" },
  ]) {
    const { error } = await supabase
      .from("clients")
      .update(change)
      .eq("id", client.clientId);
    expect(error?.message, JSON.stringify(change)).toMatch(
      /Puoi modificare solo/,
    );
  }
  const { error: rpcError } = await supabase.rpc("update_my_client_profile", {
    p_first_name: "Elsa",
    p_last_name: "Email",
    p_birth_date: "1990-01-01",
  });
  expect(rpcError).toBeNull();
  const { data: row } = await admin
    .from("clients")
    .select("phone, account_status, journey_stage, birth_date")
    .eq("id", client.clientId)
    .single();
  expect(row).toEqual({
    phone: client.phone.e164,
    account_status: "active",
    journey_stage: "in_progress",
    birth_date: "1990-01-01",
  });
});
