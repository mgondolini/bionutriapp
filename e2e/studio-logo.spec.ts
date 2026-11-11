import { expect, test, type Page } from "@playwright/test";

import { checkLogoPng } from "../src/lib/logo/png";
import { adminClient, login, OWNER } from "./helpers";

const STUDIO_ID = "aaaaaaaa-1111-4000-8000-000000000000";

/** PNG di prova disegnato nel browser: un rettangolo verde su fondo trasparente. */
async function pngOf(page: Page, width: number, height: number) {
  const dataUrl = await page.evaluate(
    ([w, h]) => {
      const canvas = document.createElement("canvas");
      canvas.width = w!;
      canvas.height = h!;
      const context = canvas.getContext("2d")!;
      context.fillStyle = "#1F7A5C";
      context.fillRect(w! * 0.1, h! * 0.1, w! * 0.8, h! * 0.8);
      return canvas.toDataURL("image/png");
    },
    [width, height],
  );
  return Buffer.from(dataUrl.split(",")[1]!, "base64");
}

let originalLogo: string | null = null;

test.beforeAll(async () => {
  const { data } = await adminClient()
    .from("studios")
    .select("logo_path")
    .eq("id", STUDIO_ID)
    .single();
  originalLogo = data?.logo_path ?? null;
});

test.afterAll(async ({ browser }) => {
  const admin = adminClient();
  const { data } = await admin
    .from("studios")
    .select("logo_path")
    .eq("id", STUDIO_ID)
    .single();
  if (data?.logo_path && data.logo_path !== originalLogo) {
    await admin.storage.from("studio-assets").remove([data.logo_path]);
  }
  await admin
    .from("studios")
    .update({ logo_path: originalLogo })
    .eq("id", STUDIO_ID);
  // un salvataggio del titolare invalida la cache del branding
  const page = await browser.newPage();
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await page.goto("/admin/impostazioni");
  const save = page.getByRole("button", { name: "Salva impostazioni" });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByText("Impostazioni salvate.")).toBeVisible();
  await page.close();
});

test("il titolare ritaglia un logo largo con margine e viene salvato un PNG quadrato da 1024 px", async ({
  page,
}) => {
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  await page.goto("/admin/impostazioni");
  const input = page.locator("#studio-logo");
  await expect(
    page.getByRole("button", { name: "Salva impostazioni" }),
  ).toBeEnabled();

  // troppo piccola: rifiutata prima del ritaglio
  await input.setInputFiles({
    name: "piccolo.png",
    mimeType: "image/png",
    buffer: await pngOf(page, 400, 300),
  });
  await expect(page.getByText(/serve almeno 512 px/)).toBeVisible();
  await expect(page.getByRole("dialog")).toBeHidden();

  // logo largo (lato corto sotto i 512 px): con "Riempi" avvisa, con
  // "Adatta con margine" no
  await input.setInputFiles({
    name: "largo.png",
    mimeType: "image/png",
    buffer: await pngOf(page, 1600, 400),
  });
  const dialog = page.getByRole("dialog", { name: "Ritaglia il logo" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/potrebbe risultare sfocata/)).toBeVisible();
  await dialog.getByRole("radio", { name: /Adatta con margine/ }).check();
  await expect(dialog.getByText(/potrebbe risultare sfocata/)).toBeHidden();
  await expect(dialog.getByRole("radio", { name: /Adatta/ })).toBeChecked();
  await dialog.getByRole("button", { name: "Usa questo ritaglio" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Nuovo logo ritagliato")).toBeVisible();

  await page.getByRole("button", { name: "Salva impostazioni" }).click();
  await expect(page.getByText("Impostazioni salvate.")).toBeVisible();

  const admin = adminClient();
  const { data: studio } = await admin
    .from("studios")
    .select("logo_path")
    .eq("id", STUDIO_ID)
    .single();
  expect(studio?.logo_path).toMatch(/\/logo-.+\.png$/);
  const { data: blob } = await admin.storage
    .from("studio-assets")
    .download(studio!.logo_path!);
  const bytes = new Uint8Array(await blob!.arrayBuffer());
  expect(checkLogoPng(bytes)).toBe("ok");
  expect(new DataView(bytes.buffer).getUint32(16)).toBe(1024);
});
