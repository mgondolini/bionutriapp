import type { NextConfig } from "next";

import { securityHeaders } from "./src/lib/security/headers";

// Deploy di anteprima su Netlify: senza NEXT_PUBLIC_APP_URL (impostata solo
// per la produzione) i link di invito ed email usano l'URL dell'anteprima.
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.DEPLOY_PRIME_URL;

// Su Netlify (staging e produzione) i link di invito ed email devono puntare
// al sito pubblicato: un indirizzo locale non si apre dal telefono del cliente.
if (
  process.env.NETLIFY &&
  appUrl &&
  /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(appUrl)
) {
  throw new Error(
    `NEXT_PUBLIC_APP_URL punta a un indirizzo locale (${appUrl}): impostala nel pannello di Netlify o rimuovila per usare l'URL del deploy.`,
  );
}

const nextConfig: NextConfig = {
  ...(appUrl ? { env: { NEXT_PUBLIC_APP_URL: appUrl } } : {}),
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Il logo dello studio arriva fino a 2 MB (più l'overhead multipart).
    serverActions: { bodySizeLimit: "3mb" },
    agentUpgrade: "security",
  },
  async headers() {
    // Aree autenticate: nessuna copia in cache (browser, proxy, CDN), così
    // dopo il logout Indietro o la riapertura della PWA non mostrano dati
    // (fase 7). Vale anche per le risposte RSC della navigazione client.
    const noStore = [{ key: "Cache-Control", value: "private, no-store" }];
    // Ordine: a parità di chiave vale l'ultima regola che corrisponde
    // (le regole specifiche di /sw.js e /attiva vengono dopo quella generale).
    return [
      // Header di sicurezza (fase 9) su tutte le risposte
      {
        source: "/:path*",
        headers: securityHeaders({
          supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
          dev: process.env.NODE_ENV === "development",
        }),
      },
      { source: "/app/:path*", headers: noStore },
      { source: "/admin/:path*", headers: noStore },
      { source: "/accesso-sospeso", headers: noStore },
      // Service worker (fase 8): sempre la versione aggiornata, solo script
      // dello stesso sito.
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self'",
          },
        ],
      },
      // Link di attivazione: il token è nel percorso. Nessun Referer verso
      // altri siti, nessuna indicizzazione, nessuna copia in cache intermedie.
      {
        source: "/attiva/:token*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
