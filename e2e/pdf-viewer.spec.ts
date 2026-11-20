import { randomUUID } from "node:crypto";

import { expect, test } from "@playwright/test";

import { linkedSamplePdf } from "../scripts/sample-pdf";

import { adminClient, login } from "./helpers";

/*
 * Visualizzatore dei PDF nell'app (react-pdf): su un telefono il link
 * interno porta alla pagina 2 e il link esterno si apre in una nuova scheda.
 * Il PDF si scarica direttamente da Supabase (URL firmato), mai dall'app.
 */

const ANNA = { email: "anna.rossi@example.test", password: "password123" };
const STUDIO = "aaaaaaaa-1111-4000-8000-000000000000";
const ANNA_ID = "aaaaaaaa-2222-4000-8000-000000000001";
const TITLE = `E2E link ${String(Date.now()).slice(-6)}`;
const VIDEO = "https://www.youtube.com/watch?v=e2eVideo001";

let fileId: string;
let storagePath: string;

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test.beforeAll(async () => {
  const admin = adminClient();
  storagePath = `${STUDIO}/${ANNA_ID}/${randomUUID()}.pdf`;
  const pdf = linkedSamplePdf(TITLE, VIDEO);
  const upload = await admin.storage
    .from("client-files")
    .upload(storagePath, pdf, { contentType: "application/pdf" });
  expect(upload.error).toBeNull();
  const { data, error } = await admin
    .from("client_files")
    .insert({
      client_id: ANNA_ID,
      category: "report",
      title: TITLE,
      storage_path: storagePath,
      size_bytes: pdf.length,
      valid_from: "2026-01-01",
    })
    .select("id")
    .single();
  expect(error).toBeNull();
  fileId = data!.id;
});

test.afterAll(async () => {
  const admin = adminClient();
  await admin.from("client_files").delete().eq("id", fileId);
  await admin.storage.from("client-files").remove([storagePath]);
});

test("link interni ed esterni del PDF funzionano nel visualizzatore", async ({
  page,
  context,
}) => {
  const pdfRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes(storagePath)) pdfRequests.push(request.url());
  });
  await context.route("https://www.youtube.com/**", (route) =>
    route.fulfill({ contentType: "text/html", body: "<p>YouTube</p>" }),
  );

  await login(page, ANNA.email, ANNA.password);
  await expect(page).toHaveURL(/\/app$/);
  await page.goto(`/app/file/${fileId}`);
  await expect(
    page.getByRole("heading", { level: 1, name: TITLE }),
  ).toBeVisible();
  await expect(page.getByText("2 pagine")).toBeVisible({ timeout: 30_000 });

  const page2 = page.getByRole("group", { name: "Pagina 2 di 2" });
  await expect(page2.locator("canvas")).toBeVisible();
  // a 390 px una pagina A4 è alta circa 500 px: la pagina 2 si vede già in
  // parte (ed è l'ultima, non arriva in cima): il link la porta tutta in vista
  await expect(page2).not.toBeInViewport({ ratio: 0.9 });

  // link interno: porta alla pagina 2
  const firstPage = page.getByRole("group", { name: "Pagina 1 di 2" });
  await expect(firstPage.locator(".annotationLayer a")).toHaveCount(2);
  await firstPage.locator(".annotationLayer a:not([target])").click();
  await expect(page2).toBeInViewport({ ratio: 0.9 });

  // link esterno: nuova scheda, senza accesso a questa finestra
  await firstPage.scrollIntoViewIfNeeded();
  const external = page.locator(`.annotationLayer a[href="${VIDEO}"]`);
  await expect(external).toHaveAttribute("target", "_blank");
  await expect(external).toHaveAttribute("rel", "noopener noreferrer");
  const [popup] = await Promise.all([
    page.waitForEvent("popup"),
    external.click(),
  ]);
  await expect(popup).toHaveURL(VIDEO);

  // il PDF arriva direttamente da Supabase con un URL firmato, mai dall'app
  const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;
  expect(pdfRequests.length).toBeGreaterThan(0);
  for (const url of pdfRequests) {
    expect(new URL(url).origin).toBe(supabase);
    expect(url).toContain("/storage/v1/object/sign/client-files/");
  }
});
