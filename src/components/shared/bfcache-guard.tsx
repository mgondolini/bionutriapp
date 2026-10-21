"use client";

import { useEffect } from "react";

/**
 * Aree autenticate: se il browser ripristina la pagina dalla back/forward
 * cache (Indietro dopo il logout), la ricarica dal server, che porta al
 * login se la sessione non c'è più. Insieme a `Cache-Control: no-store` evita
 * che i dati del cliente ricompaiano dopo l'uscita (fase 7).
 */
export function BfcacheGuard() {
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);
  return null;
}
