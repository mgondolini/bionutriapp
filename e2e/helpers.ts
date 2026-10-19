import { createHash } from "node:crypto";

import { expect, type Browser, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/** Account del seed (supabase/seed.sql). */
export const OWNER = {
  email: "titolare.verde@example.test",
  password: "password123",
  displayName: "Dott.ssa Elena Verdi",
  studioName: "Studio Verde Nutrizione",
};

/** Cellulare mobile italiano casuale, nel formato digitato e in E.164. */
export function randomMobile() {
  const rest = String(Math.floor(1_000_000 + Math.random() * 8_999_999));
  return { typed: `345 ${rest}`, e164: `+39345${rest}` };
}

/** Client con secret key, solo per preparare e ripulire i dati del database LOCALE. */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(url)) {
    throw new Error("I test e2e girano solo sul Supabase locale");
  }
  return createClient(url, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function tokenHash(link: string): string {
  const token = new URL(link).pathname.split("/").pop()!;
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Elimina clienti e utenti creati dal test (per cellulare). Prima i clienti:
 * un cliente attivo deve avere un account (vincolo clients_active_requires_account),
 * quindi il suo utente non si può eliminare finché il cliente esiste.
 */
export async function cleanup(phones: string[]) {
  const admin = adminClient();
  const { data: clients, error } = await admin
    .from("clients")
    .delete()
    .in("phone", phones)
    .select("user_id");
  if (error) throw error;
  for (const client of clients ?? []) {
    if (!client.user_id) continue;
    const { error: userError } = await admin.auth.admin.deleteUser(
      client.user_id,
    );
    if (userError) {
      throw new Error(`Utente di test non eliminato: ${userError.message}`);
    }
  }
}

export async function login(page: Page, identifier: string, password: string) {
  await page.goto("/login");
  // il pulsante si abilita dopo l'idratazione: compilare prima perderebbe i valori
  const submit = page.getByRole("button", { name: "Accedi" });
  await expect(submit).toBeEnabled();
  await page.getByLabel("Email o cellulare").fill(identifier);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await submit.click();
}

/** Nuova sessione del browser (un altro dispositivo, senza cookie). */
export async function newDevice(browser: Browser) {
  const context = await browser.newContext({ locale: "it-IT" });
  return { context, page: await context.newPage() };
}

/**
 * Clic su un pulsante WhatsApp: la finestra si apre subito e riceve
 * l'indirizzo wa.me (intercettato, nessuna uscita verso internet).
 * Restituisce il link di attivazione contenuto nel messaggio.
 */
export async function inviteLinkFrom(page: Page, click: () => Promise<void>) {
  const popupPromise = page.waitForEvent("popup");
  await click();
  const popup = await popupPromise;
  await popup.waitForURL(/^https:\/\/wa\.me\//);
  const url = new URL(popup.url());
  await popup.close();
  const text = url.searchParams.get("text") ?? "";
  const link = text.match(/https?:\/\/\S+\/attiva\/[A-Za-z0-9_-]{43}/)?.[0];
  expect(link, `link nel messaggio: ${text}`).toBeTruthy();
  return { link: link!, text, phoneDigits: url.pathname.slice(1) };
}
