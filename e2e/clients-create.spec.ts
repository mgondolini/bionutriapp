import { expect, test } from "@playwright/test";

import {
  adminClient,
  cleanup,
  inviteLinkFrom,
  login,
  OWNER,
  randomMobile,
} from "./helpers";

/*
 * Nuovo cliente e import CSV (A-04, A-05): un solo form con dati completi e
 * fase scelta (In percorso o Onboarding); dopo la creazione il pannello
 * manda subito l'invito WhatsApp. L'import applica la fase scelta a tutte
 * le righe del file.
 */

const run = Date.now().toString(36);
const phones: string[] = [];

test.describe.configure({ mode: "serial" });

test.beforeEach(async ({ context }) => {
  // WhatsApp non viene mai aperto davvero
  await context.route("https://wa.me/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<p>WhatsApp</p>" }),
  );
});

test.afterAll(async () => {
  await cleanup(phones);
});

async function clientByPhone(e164: string) {
  const { data, error } = await adminClient()
    .from("clients")
    .select("last_name, account_status, journey_stage, origin")
    .eq("phone", e164)
    .single();
  if (error) throw error;
  return data;
}

test("nuovo cliente in Onboarding: invito WhatsApp subito dal pannello", async ({
  page,
}) => {
  const client = {
    firstName: "Olga",
    lastName: `Onboard${run}`,
    ...randomMobile(),
  };
  phones.push(client.e164);

  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await page.goto("/admin/clienti");
  await page.getByRole("button", { name: "Nuovo cliente" }).click();
  const dialog = page.getByRole("dialog");
  // In percorso è la scelta predefinita
  await expect(
    dialog.getByRole("radio", { name: "In percorso" }),
  ).toBeChecked();
  await dialog.getByRole("radio", { name: "Onboarding" }).check();
  await dialog
    .getByRole("textbox", { name: "Nome", exact: true })
    .fill(client.firstName);
  await dialog
    .getByRole("textbox", { name: "Cognome", exact: true })
    .fill(client.lastName);
  await dialog.getByRole("textbox", { name: "Cellulare" }).fill(client.typed);
  await dialog.getByRole("button", { name: "Crea cliente" }).click();

  const name = `${client.firstName} ${client.lastName}`;
  await expect(dialog.getByText(`${name} è nell'elenco`)).toBeVisible();
  expect(await clientByPhone(client.e164)).toMatchObject({
    last_name: client.lastName,
    account_status: "to_invite",
    journey_stage: "onboarding",
    origin: "new",
  });

  const invite = await inviteLinkFrom(page, () =>
    dialog.getByRole("button", { name: "Invia invito su WhatsApp" }).click(),
  );
  expect(invite.phoneDigits).toBe(client.e164.slice(1));
  await expect
    .poll(async () => (await clientByPhone(client.e164)).account_status)
    .toBe("invited");

  // "Aggiungi un altro cliente" riapre il form vuoto
  await dialog
    .getByRole("button", { name: "Aggiungi un altro cliente" })
    .click();
  await expect(
    dialog.getByRole("textbox", { name: "Nome", exact: true }),
  ).toHaveValue("");
});

test("import CSV in Onboarding: la fase vale per tutte le righe", async ({
  page,
}) => {
  const rows = [0, 1].map((i) => ({
    firstName: `Csv${i}`,
    lastName: `Import${run}`,
    ...randomMobile(),
  }));
  phones.push(...rows.map((row) => row.e164));
  const csv = [
    "nome;cognome;cellulare",
    ...rows.map((row) => `${row.firstName};${row.lastName};${row.typed}`),
  ].join("\n");

  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await page.goto("/admin/clienti");
  await page.getByRole("button", { name: "Importa CSV" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "clienti.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv, "utf8"),
  });
  await dialog.getByRole("radio", { name: "Onboarding" }).check();
  await dialog.getByRole("button", { name: "Analizza il file" }).click();
  await expect(
    dialog.getByText(/Entreranno con fase Onboarding e stato Da invitare/),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Conferma", exact: true }).click();
  await dialog.getByRole("button", { name: "Importa 2 clienti" }).click();
  await expect(page.getByText("2 clienti importati.")).toBeVisible();

  for (const row of rows) {
    expect(await clientByPhone(row.e164)).toMatchObject({
      account_status: "to_invite",
      journey_stage: "onboarding",
      origin: "new",
    });
  }
});
