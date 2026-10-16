"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import type { CleanResult } from "@/lib/csv/clean-clients";
import * as clientsService from "@/server/services/clients.service";
import { getStaffSession } from "@/server/services/session.service";
import {
  createClientSchema,
  csvImportSchema,
  type CreateClientFormValues,
  type CsvImportInput,
} from "@/server/validation/clients.schema";
import { fail, ok, type ActionResult } from "@/types/action-result";

const t = copy.admin.clients;

/** Nuovo cliente (A-04). Lo studio arriva dalla sessione, mai dal form. */
export async function createClientAction(
  input: CreateClientFormValues,
): Promise<ActionResult<{ id: string }>> {
  const session = await getStaffSession();
  if (!session) return fail(copy.common.unauthorized);

  const parsed = createClientSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      copy.common.invalidInput,
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const result = await clientsService.createClient(
    session.studio.id,
    parsed.data,
  );
  if (!result.ok) {
    if (result.reason === "duplicate_email") {
      return fail(t.create.duplicateEmail, {
        email: [t.create.duplicateEmail],
      });
    }
    return fail(t.create.duplicatePhone, { phone: [t.create.duplicatePhone] });
  }

  revalidatePath(ROUTES.admin.clients);
  return ok({ id: result.id });
}

/** Anteprima dell'import (A-05): righe valide e righe scartate con il motivo. */
export async function previewImportAction(
  input: CsvImportInput,
): Promise<ActionResult<CleanResult>> {
  const session = await getStaffSession();
  if (!session) return fail(copy.common.unauthorized);

  const parsed = csvImportSchema.safeParse(input);
  if (!parsed.success) return fail(t.import.fileErrors.too_large);

  const analysis = await clientsService.analyzeImport(
    session.studio.id,
    parsed.data.csv,
  );
  if (!analysis.ok) return fail(t.import.fileErrors[analysis.error]);
  return ok(analysis.result);
}

/** Conferma dell'import: il server rianalizza il file e inserisce tutto o niente. */
export async function confirmImportAction(
  input: CsvImportInput,
): Promise<ActionResult<{ imported: number }>> {
  const session = await getStaffSession();
  if (!session) return fail(copy.common.unauthorized);

  const parsed = csvImportSchema.safeParse(input);
  if (!parsed.success) return fail(t.import.fileErrors.too_large);

  const result = await clientsService.importClients(
    session.studio.id,
    parsed.data.csv,
  );
  if (!result.ok) {
    if (result.error === "conflict") return fail(t.import.conflict);
    if (result.error === "no_valid_rows") return fail(t.import.noValidRows);
    return fail(t.import.fileErrors[result.error]);
  }

  revalidatePath(ROUTES.admin.clients);
  return ok({ imported: result.imported });
}
