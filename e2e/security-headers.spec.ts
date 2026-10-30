import { expect, test, type Page } from "@playwright/test";

import { login, OWNER } from "./helpers";

/*
 * Header di sicurezza (fase 9) e Content-Security-Policy: presenti su ogni
 * risposta e senza violazioni nelle schermate principali (script inline di
 * Next.js, colore dello studio, loghi e caricamenti su Supabase).
 */

function collectCspViolations(page: Page) {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy|Refused to/i.test(message.text())) {
      violations.push(message.text());
    }
  });
  return violations;
}

test("header di sicurezza su pagine pubbliche e aree autenticate", async ({
  request,
}) => {
  for (const path of ["/login", "/privacy", "/app", "/admin"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    const headers = response.headers();
    expect(headers["content-security-policy"], path).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["strict-transport-security"], path).toContain("max-age=");
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["referrer-policy"], path).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers["permissions-policy"], path).toContain("camera=()");
  }
  // regole specifiche che restano: service worker e link di attivazione
  const sw = await request.get("/sw.js");
  expect(sw.headers()["content-security-policy"]).toBe(
    "default-src 'self'; script-src 'self'",
  );
  const activation = await request.get("/attiva/link-di-prova");
  expect(activation.headers()["referrer-policy"]).toBe("no-referrer");
});

test("nessuna violazione della CSP nelle schermate principali", async ({
  page,
}) => {
  const violations = collectCspViolations(page);
  await page.goto("/login");
  await login(page, OWNER.email, OWNER.password);
  await expect(page).toHaveURL(/\/admin/);
  for (const path of ["/admin/clienti", "/admin/impostazioni", "/privacy"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(violations).toEqual([]);
});
