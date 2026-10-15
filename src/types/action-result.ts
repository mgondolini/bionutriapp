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
