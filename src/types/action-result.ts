/**
 * Formato unico dei risultati delle Server Actions (DEV-07).
 * `fieldErrors` riporta gli errori di validazione Zod per campo, da mostrare nel form.
 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };

export function ok<T>(data: T): ActionResult<T>;
export function ok(): ActionResult<void>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(
  error: string,
  fieldErrors?: Record<string, string[] | undefined>,
): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/**
 * Errore delle Server Actions quando manca una sessione valida (scaduta o
 * revocata): l'interfaccia porta al login con "La sessione è scaduta"
 * (`redirectIfSignedOut`). Diverso da "non autorizzato" (sessione valida,
 * ruolo o dato non consentiti).
 */
export const UNAUTHENTICATED = "unauthenticated";

export function isUnauthenticated(result: ActionResult<unknown>): boolean {
  return !result.ok && result.error === UNAUTHENTICATED;
}
