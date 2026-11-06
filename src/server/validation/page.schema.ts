// Schemi Zod condivisi tra form (client) e Server Actions: niente "server-only".
import { z } from "zod";

/** Primo valore di un parametro dell'URL (searchParams può contenere array). */
export const firstValue = (value: unknown) =>
  Array.isArray(value) ? value[0] : value;

/**
 * Numero di pagina dall'URL (`?pagina=`): un valore non valido vale 1, oltre
 * l'ultima pagina la riporta indietro `paginate()`.
 */
export const pageParamSchema = z
  .preprocess(firstValue, z.coerce.number().int().min(1).default(1))
  .catch(1);
