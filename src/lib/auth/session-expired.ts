import { loginUrl } from "@/lib/auth/route-decision";
import { isUnauthenticated, type ActionResult } from "@/types/action-result";

/**
 * Da chiamare nel browser dopo ogni Server Action delle aree autenticate:
 * se la sessione è scaduta o revocata (`unauthenticated`) porta al login con
 * il messaggio "La sessione è scaduta" e il ritorno alla pagina corrente.
 * Navigazione completa con `replace`: lo stato della pagina viene azzerato e
 * Indietro non torna alla pagina protetta.
 */
export function redirectIfSignedOut(result: ActionResult<unknown>): boolean {
  if (!isUnauthenticated(result)) return false;
  window.location.replace(
    loginUrl({
      next: `${window.location.pathname}${window.location.search}`,
      reason: "expired",
    }),
  );
  return true;
}
