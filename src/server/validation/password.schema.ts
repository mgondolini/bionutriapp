// Schemi Zod condivisi tra form (client) e Server Actions: niente "server-only".
// Unico schema della password (DEV-09): attivazione (C-08), nuova password
// dal link di recupero e cambio password dal profilo (C-07).
import { z } from "zod";

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

const v = copy.auth.validation;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, v.passwordTooShort)
  .max(PASSWORD_MAX_LENGTH, v.passwordTooLong);
