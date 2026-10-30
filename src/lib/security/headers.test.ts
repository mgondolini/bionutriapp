import { describe, expect, it } from "vitest";

import { contentSecurityPolicy, securityHeaders } from "./headers";

function directives(csp: string) {
  return Object.fromEntries(
    csp.split("; ").map((part) => {
      const [name, ...values] = part.split(" ");
      return [name, values];
    }),
  );
}

describe("contentSecurityPolicy", () => {
  it("in produzione: Supabase solo per connessioni e immagini, niente eval, upgrade a https", () => {
    const csp = directives(
      contentSecurityPolicy({
        supabaseUrl: "https://abc.supabase.co/",
        dev: false,
      }),
    );
    expect(csp["script-src"]).toEqual(["'self'", "'unsafe-inline'"]);
    expect(csp["connect-src"]).toEqual(["'self'", "https://abc.supabase.co"]);
    expect(csp["img-src"]).toContain("https://abc.supabase.co");
    expect(csp["frame-ancestors"]).toEqual(["'none'"]);
    expect(csp["object-src"]).toEqual(["'none'"]);
    expect(csp["worker-src"]).toEqual(["'self'"]);
    expect(csp).toHaveProperty("upgrade-insecure-requests");
  });

  it("in locale: eval per React in sviluppo, nessun upgrade con Supabase in http", () => {
    const csp = directives(
      contentSecurityPolicy({
        supabaseUrl: "http://127.0.0.1:54321",
        dev: true,
      }),
    );
    expect(csp["script-src"]).toContain("'unsafe-eval'");
    expect(csp["connect-src"]).toEqual(["'self'", "http://127.0.0.1:54321"]);
    expect(csp).not.toHaveProperty("upgrade-insecure-requests");
  });

  it("senza URL valido non aggiunge origini", () => {
    const csp = directives(
      contentSecurityPolicy({ supabaseUrl: "non un url", dev: false }),
    );
    expect(csp["connect-src"]).toEqual(["'self'"]);
  });
});

describe("securityHeaders", () => {
  it("contiene tutti gli header richiesti", () => {
    const keys = securityHeaders({ supabaseUrl: undefined, dev: false }).map(
      (header) => header.key,
    );
    expect(keys).toEqual(
      expect.arrayContaining([
        "Content-Security-Policy",
        "Strict-Transport-Security",
        "X-Content-Type-Options",
        "X-Frame-Options",
        "Referrer-Policy",
        "Permissions-Policy",
      ]),
    );
  });
});
