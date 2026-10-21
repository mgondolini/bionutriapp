"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { clientDetailPath, ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import type { CleanResult } from "@/lib/csv/clean-clients";
import * as clientsService from "@/server/services/clients.service";
import { getStaffSession } from "@/server/services/session.service";
import {
  changeStageSchema,
  clientAccountSchema,
  createClientSchema,
  csvImportSchema,
  updateClientSchema,
  type ChangeStageInput,
  type ClientAccountInput,
  type CreateClientFormValues,
  type CsvImportInput,
  type UpdateClientFormValues,
} from "@/server/validation/clients.schema";
import { fail, ok, type ActionResult } from "@/types/action-result";
import { authFailure } from "@/server/actions/session-guard";

const t = copy.admin.clients;

/** Nuovo cliente (A-04). Lo studio arriva dalla sessione, mai dal form. */
export async function createClientAction(
  input: CreateClientFormValues,
): Promise<ActionResult<{ id: string }>> {
  const session = await getStaffSession();
  if (!session) return authFailure();

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
  if (!session) return authFailure();

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
  if (!session) return authFailure();

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

const p = copy.admin.clients.profile;

function revalidateClient(clientId: string) {
  revalidatePath(ROUTES.admin.clients);
  revalidatePath(clientDetailPath(clientId), "layout");
}

/** Modifica dei dati anagrafici (A-06); con un account aggiorna anche Supabase Auth. */
export async function updateClientAction(
  input: UpdateClientFormValues,
): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return authFailure();

  const parsed = updateClientSchema.safeParse(input);
  if (!parsed.success) {
    return fail(
      copy.common.invalidInput,
      z.flattenError(parsed.error).fieldErrors,
    );
  }

  const result = await clientsService.updateClient(
    session.studio.id,
    parsed.data,
  );
  if (!result.ok) {
    switch (result.reason) {
      case "not_found":
        return fail(t.detail.notFoundDescription);
      case "duplicate_email":
        return fail(t.create.duplicateEmail, {
          email: [t.create.duplicateEmail],
        });
      case "duplicate_phone":
        return fail(t.create.duplicatePhone, {
          phone: [t.create.duplicatePhone],
        });
      case "email_required":
        return fail(p.data.emailRequired, { email: [p.data.emailRequired] });
      case "auth_conflict":
        return fail(p.data.authConflict);
    }
  }

  revalidateClient(parsed.data.clientId);
  return ok();
}

/** Cambio di fase manuale (ST-02, A-07): solo le transizioni consentite. */
export async function changeStageAction(
  input: ChangeStageInput,
): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return authFailure();

  const parsed = changeStageSchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);

  const result = await clientsService.changeStage(
    session.studio.id,
    parsed.data,
  );
  if (!result.ok) {
    if (result.reason === "not_found")
      return fail(t.detail.notFoundDescription);
    return fail(
      result.reason === "not_allowed" ? p.stage.notAllowed : p.stage.conflict,
    );
  }

  revalidateClient(parsed.data.clientId);
  return ok();
}

/** Disattiva l'account (ST-01): accesso sospeso, fase e dati invariati. */
export async function disableAccountAction(
  input: ClientAccountInput,
): Promise<ActionResult> {
  return toggleAccount(input, clientsService.disableAccount);
}

/** Riattiva l'account disattivato. */
export async function enableAccountAction(
  input: ClientAccountInput,
): Promise<ActionResult> {
  return toggleAccount(input, clientsService.enableAccount);
}

async function toggleAccount(
  input: ClientAccountInput,
  run: (
    studioId: string,
    clientId: string,
  ) => Promise<clientsService.AccountToggleResult>,
): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return authFailure();

  const parsed = clientAccountSchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);

  const result = await run(session.studio.id, parsed.data.clientId);
  if (!result.ok) {
    return fail(
      result.reason === "not_found"
        ? t.detail.notFoundDescription
        : copy.common.genericError,
    );
  }

  revalidateClient(parsed.data.clientId);
  return ok();
}
