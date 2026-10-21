import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Il logo dello studio arriva fino a 2 MB (più l'overhead multipart).
    serverActions: { bodySizeLimit: "3mb" },
  },
  // Link di attivazione: il token è nel percorso. Nessun Referer verso altri
  // siti, nessuna indicizzazione, nessuna copia in cache intermedie.
  async headers() {
    // Aree autenticate: nessuna copia in cache (browser, proxy, CDN), così
    // dopo il logout Indietro o la riapertura della PWA non mostrano dati
    // (fase 7). Vale anche per le risposte RSC della navigazione client.
    const noStore = [{ key: "Cache-Control", value: "private, no-store" }];
    return [
      { source: "/app/:path*", headers: noStore },
      { source: "/admin/:path*", headers: noStore },
      { source: "/accesso-sospeso", headers: noStore },
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
