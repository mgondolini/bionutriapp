/*
 * Header di sicurezza (fase 9), applicati a tutte le risposte da
 * next.config.ts. Funzioni pure, testate con Vitest.
 *
 * CSP senza nonce: con Cache Components (PPR) i nonce non sono compatibili
 * con le pagine prerenderizzate (guida "Content Security Policy" di Next.js),
 * quindi script e stili inline sono ammessi con 'unsafe-inline'. Servono per
 * gli script di Next.js, INSTALL_PROMPT_CAPTURE (layout cliente), il colore
 * dello studio (StudioThemeStyle) e i grafici. Tutto il resto è limitato al
 * sito e al progetto Supabase.
 */

type CspOptions = {
  /** NEXT_PUBLIC_SUPABASE_URL: caricamento dei PDF (PUT firmato) e loghi. */
  supabaseUrl: string | undefined;
  /** In sviluppo React usa eval per le tracce degli errori. */
  dev: boolean;
};

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export function contentSecurityPolicy({ supabaseUrl, dev }: CspOptions) {
  const supabase = originOf(supabaseUrl);
  const withSupabase = (...sources: string[]) =>
    [...sources, ...(supabase ? [supabase] : [])].join(" ");
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${withSupabase("'self'", "data:", "blob:")}`,
    "font-src 'self'",
    `connect-src ${withSupabase("'self'")}`,
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ];
  // Solo con Supabase in https (produzione, anteprime): in locale Supabase è
  // in http e le richieste verrebbero trasformate in https.
  if (supabase?.startsWith("https:"))
    directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

export function securityHeaders(options: CspOptions) {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(options) },
    // 2 anni, sottodomini compresi; niente preload (difficile da annullare)
    {
      key: "Strict-Transport-Security",
      value: "max-age=63072000; includeSubDomains",
    },
    { key: "X-Content-Type-Options", value: "nosniff" },
    // equivalente a frame-ancestors 'none' per i browser più vecchi
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    {
      key: "Permissions-Policy",
      value:
        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), serial=(), hid=()",
    },
  ];
}
