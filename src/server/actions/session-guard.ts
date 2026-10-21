import "server-only";

import { copy } from "@/lib/copy/it";
import { getSession } from "@/server/services/session.service";
import {
  fail,
  UNAUTHENTICATED,
  type ActionResult,
} from "@/types/action-result";

/**
 * Esito di un'azione rifiutata: `unauthenticated` se non c'è più una sessione
 * valida (l'interfaccia porta al login), altrimenti "non autorizzato".
 * Va usata in ogni punto in cui un'azione rifiuta l'utente, anche quando la
 * RLS nasconde la riga: una sessione revocata a metà richiesta finisce qui.
 */
export async function authFailure(): Promise<ActionResult<never>> {
  const session = await getSession();
  return session.kind === "anonymous"
    ? fail(UNAUTHENTICATED)
    : fail(copy.common.unauthorized);
}
