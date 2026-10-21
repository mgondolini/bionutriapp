"use client";

import { useTransition } from "react";

import { loginUrl } from "@/lib/auth/route-decision";
import { currentPushEndpoint } from "@/lib/push/current-endpoint";
import { signOutAction } from "@/server/actions/auth.actions";

/**
 * Uscita dal browser (fase 7): invia l'endpoint push di questo dispositivo,
 * chiude la sessione (`local`) o tutte (`global`) e porta al login con una
 * navigazione completa e `replace`. Così lo stato della pagina, la cache del
 * router e la voce della cronologia della pagina protetta non restano.
 */
export function useSignOut() {
  const [isPending, startTransition] = useTransition();

  const signOut = (scope: "local" | "global") => {
    startTransition(async () => {
      const endpoint = await currentPushEndpoint();
      await signOutAction({ scope, endpoint });
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
