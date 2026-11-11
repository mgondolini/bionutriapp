"use client";

import { useTransition } from "react";

import { loginUrl } from "@/lib/auth/route-decision";
import { unsubscribeFromPush } from "@/lib/pwa/push-client";
import { signOutAction } from "@/server/actions/auth.actions";

/**
 * Uscita dal browser (fase 7): chiude la sessione (`local`) o tutte
 * (`global`) e porta al login con una navigazione completa e `replace`.
 * Con `local` la sottoscrizione push resta: al nuovo accesso le notifiche
 * sono ancora attive. Se entra un altro utente sullo stesso telefono,
 * `readRegisteredSubscription` la annulla (il server non la conosce per lui).
 * Con `global` il server le elimina tutte e qui si annulla anche quella del
 * browser. Così lo stato della pagina, la cache del
 * router e la voce della cronologia della pagina protetta non restano.
 */
export function useSignOut() {
  const [isPending, startTransition] = useTransition();

  const signOut = (scope: "local" | "global") => {
    startTransition(async () => {
      await signOutAction({ scope });
      if (scope === "global") await unsubscribeFromPush();
      try {
        sessionStorage.clear();
      } catch {
        // storage non disponibile (navigazione privata): niente da azzerare
      }
      window.location.replace(loginUrl({ reason: "loggedOut" }));
    });
  };

  return { signOut, isPending };
}
