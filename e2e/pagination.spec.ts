import { expect, test } from "@playwright/test";

import { addDays, todayInRome } from "../src/lib/domain/tracking/dates";
import {
  adminClient,
  cleanup,
  createActiveClient,
  login,
  OWNER,
  randomMobile,
} from "./helpers";

/*
 * Paginazione: elenco clienti dello staff 20 per pagina e file della scheda
 * File 10 per pagina, con la pagina nell'URL; storico di una misura e
 * archivio dei file del cliente 10 per pagina con le frecce, senza ricaricare.
 */

const STUDIO_ID = "aaaaaaaa-1111-4000-8000-000000000000";
const SEARCH = "Paginazione";
const CLIENTS = 25;
const WORKOUTS = 12;
/** Uno è il file in corso, gli altri 12 stanno nell'archivio del cliente. */
const FILES = 13;
const PASSWORD = "password-pagine-1";
const phones: string[] = [];
let activeClientId = "";
let activePhone = "";

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const admin = adminClient();
  const rows = Array.from({ length: CLIENTS }, (_, i) => {
    const phone = randomMobile().e164;
    phones.push(phone);
    return {
      studio_id: STUDIO_ID,
      first_name: `Cliente ${String(i + 1).padStart(2, "0")}`,
      last_name: SEARCH,
      phone,
      origin: "new",
    };
  });
  const { error } = await admin.from("clients").insert(rows);
  if (error) throw error;

  const active = await createActiveClient({
    firstName: "Storico",
    lastName: "Lungo",
    password: PASSWORD,
    email: null,
  });
  activeClientId = active.clientId;
  activePhone = active.phone.typed;
  phones.push(active.phone.e164);
  const { data: metric, error: metricError } = await admin
    .from("metrics")
    .select("id")
    .eq("studio_id", STUDIO_ID)
    .eq("key", "workouts")
    .single();
  if (metricError) throw metricError;
  const today = todayInRome();
  const { error: entriesError } = await admin.from("tracking_entries").insert(
    Array.from({ length: WORKOUTS }, (_, i) => ({
      client_id: activeClientId,
      metric_id: metric.id,
      value: (i % 10) + 1,
      recorded_on: addDays(today, -(i + 1)),
    })),
  );
  if (entriesError) throw entriesError;

  // solo righe: l'elenco non legge gli oggetti dello Storage
  const { error: filesError } = await admin.from("client_files").insert(
    Array.from({ length: FILES }, (_, i) => ({
      client_id: activeClientId,
      category: "workout",
      title: `Scheda ${String(i + 1).padStart(2, "0")}`,
      storage_path: `${STUDIO_ID}/${activeClientId}/${crypto.randomUUID()}.pdf`,
      size_bytes: 1024,
      valid_from: addDays(today, -(i + 1)),
    })),
  );
  if (filesError) throw filesError;
});

test.afterAll(async () => {
  await cleanup(phones);
});

test("l'elenco clienti mostra 20 clienti per pagina con la pagina nell'URL", async ({
  page,
}) => {
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await page.goto(`/admin/clienti?q=${SEARCH}`);

  const pagination = page.getByRole("navigation", { name: "Paginazione" });
  await expect(pagination.getByText("1–20 di 25")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(20);

  await pagination.getByRole("link", { name: "Pagina successiva" }).click();
  await expect(page).toHaveURL(/pagina=2/);
  await expect(pagination.getByText("21–25 di 25")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(5);
  await expect(
    pagination.getByRole("button", { name: "Pagina successiva" }),
  ).toHaveAttribute("aria-disabled", "true");

  // Indietro torna alla prima pagina
  await page.goBack();
  await expect(pagination.getByText("1–20 di 25")).toBeVisible();

  // una pagina oltre l'ultima mostra l'ultima
  await page.goto(`/admin/clienti?q=${SEARCH}&pagina=99`);
  await expect(pagination.getByText("21–25 di 25")).toBeVisible();
});

test("lo storico di una misura mostra 10 registrazioni per pagina", async ({
  page,
}) => {
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await page.goto(`/admin/clienti/${activeClientId}/tracking/workouts`);

  const pagination = page.getByRole("navigation", { name: "Paginazione" });
  const rows = page.getByTestId("entry-row");
  await expect(pagination.getByText("1–10 di 12")).toBeVisible();
  await expect(rows).toHaveCount(10);

  const next = pagination.getByRole("button", { name: "Pagina successiva" });
  await next.click();
  await expect(pagination.getByText("11–12 di 12")).toBeVisible();
  await expect(rows).toHaveCount(2);
  await expect(next).toHaveAttribute("aria-disabled", "true");
  // il focus resta sulla freccia anche al limite
  await expect(next).toBeFocused();

  await pagination.getByRole("button", { name: "Pagina precedente" }).click();
  await expect(rows).toHaveCount(10);
});

test("la scheda File mostra 10 file per pagina con la pagina nell'URL", async ({
  page,
}) => {
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await page.goto(`/admin/clienti/${activeClientId}/file`);

  const pagination = page.getByRole("navigation", { name: "Paginazione" });
  await expect(pagination.getByText("1–10 di 13")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(10);

  await pagination.getByRole("link", { name: "Pagina successiva" }).click();
  await expect(page).toHaveURL(/pagina=2/);
  await expect(pagination.getByText("11–13 di 13")).toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(3);

  // il filtro per categoria torna alla prima pagina
  await page
    .getByRole("navigation", { name: "Filtra per categoria" })
    .getByRole("link", { name: /Allenament/ })
    .click();
  await expect(page).not.toHaveURL(/pagina=/);
  await expect(pagination.getByText("1–10 di 13")).toBeVisible();
});

test("l'archivio dei file del cliente mostra 10 file per pagina", async ({
  page,
}) => {
  await login(page, activePhone, PASSWORD);
  await expect(page).toHaveURL(/\/app/);
  await page.goto("/app/allenamenti");

  const archive = page.getByRole("region", { name: "Archivio" });
  const pagination = page.getByRole("navigation", { name: "Paginazione" });
  await expect(pagination.getByText("1–10 di 12")).toBeVisible();
  await expect(archive.getByRole("listitem")).toHaveCount(10);

  await pagination.getByRole("button", { name: "Pagina successiva" }).click();
  await expect(pagination.getByText("11–12 di 12")).toBeVisible();
  await expect(archive.getByRole("listitem")).toHaveCount(2);
});
