import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

// Stesse variabili dell'app (.env.local): URL e chiavi del Supabase LOCALE.
// Per un deploy di anteprima: E2E_ENV_FILE=.env.test.local (progetto Supabase
// di PROVA) e PLAYWRIGHT_BASE_URL=<url dell'anteprima>; nessun server locale.
if (process.env.E2E_ENV_FILE) process.loadEnvFile(process.env.E2E_ENV_FILE);
loadEnvConfig(process.cwd());

const remoteBaseURL = process.env.PLAYWRIGHT_BASE_URL;
const baseURL =
  remoteBaseURL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Test end-to-end dei flussi critici (DEV-18). Richiedono il database locale
 * con il seed (`pnpm supabase start`, `pnpm supabase db reset`): i dati creati
 * dai test usano cellulari casuali e vengono eliminati alla fine.
 */
export default defineConfig({
  testDir: "./e2e",
  // un solo database condiviso: niente esecuzione in parallelo
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL,
    locale: "it-IT",
    timezoneId: "Europe/Rome",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: remoteBaseURL
    ? undefined
    : {
        command: "pnpm dev",
        url: `${baseURL}/login`,
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
