"use client";

import { useTransition } from "react";

import { loginUrl } from "@/lib/auth/route-decision";
import {
  currentPushEndpoint,
  unsubscribeFromPush,
} from "@/lib/pwa/push-client";
import { signOutAction } from "@/server/actions/auth.actions";

/**
 * Uscita dal browser (fase 7): invia l'endpoint push di questo dispositivo,
 * chiude la sessione (`local`) o tutte (`global`), annulla la sottoscrizione
 * anche nel browser (chi entra dopo sullo stesso telefono non riceve gli
 * avvisi di questo utente, fase 8) e porta al login con una
 * navigazione completa e `replace`. Così lo stato della pagina, la cache del
 * router e la voce della cronologia della pagina protetta non restano.
 */
export function useSignOut() {
  const [isPending, startTransition] = useTransition();

  const signOut = (scope: "local" | "global") => {
    startTransition(async () => {
      const endpoint = await currentPushEndpoint();
      await signOutAction({ scope, endpoint });
      if (endpoint) await unsubscribeFromPush();
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
