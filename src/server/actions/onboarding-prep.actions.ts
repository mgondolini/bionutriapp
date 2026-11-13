"use server";

import { revalidatePath } from "next/cache";

import { ROUTES, clientDetailPath } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { authFailure } from "@/server/actions/session-guard";
import * as prepService from "@/server/services/onboarding-prep.service";
import { getSession, getStaffSession } from "@/server/services/session.service";
import {
  saveMeasuresSchema,
  setCallSchema,
  type SaveMeasuresInput,
  type SetCallInput,
} from "@/server/validation/onboarding-prep.schema";
import { fail, ok, type ActionResult } from "@/types/action-result";

const t = copy.onboardingPrep;

/** Pagine del cliente, scheda dello staff (Profilo, Tracking) ed elenco clienti. */
function revalidatePrep(clientId: string) {
  revalidatePath(ROUTES.client.home, "layout");
  revalidatePath(`${ROUTES.admin.clients}/${clientId}`, "layout");
  revalidatePath(ROUTES.admin.clients);
}

/** Misure di partenza del cliente in Onboarding (C29). */
export async function saveOnboardingMeasuresAction(
  input: SaveMeasuresInput,
): Promise<ActionResult> {
  const session = await getSession();
  if (session.kind !== "client" || !session.studio.id) return authFailure();
  const parsed = saveMeasuresSchema.safeParse(input);
  if (!parsed.success) return fail(copy.common.invalidInput);

  const result = await prepService.saveOwnMeasures(
    { studioId: session.studio.id, stage: session.client.journeyStage },
    parsed.data,
  );
  if (!result.ok) {
    if (result.reason === "not_onboarding")
      return fail(t.measuresPage.notAllowed);
    if (result.reason === "invalid") {
      const first = Object.values(result.fieldErrors ?? {})[0]?.[0];
      return fail(first ?? copy.common.invalidInput, result.fieldErrors);
    }
    return fail(t.measuresPage.failed);
  }
  revalidatePrep(session.client.id);
  return ok();
}

/** Data e ora della chiamata di onboarding dalla scheda Profilo (A5). */
export async function setOnboardingCallAction(
  input: SetCallInput,
): Promise<ActionResult> {
  const session = await getStaffSession();
  if (!session) return authFailure();
  const parsed = setCallSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? copy.common.invalidInput);
  }
  const result = await prepService.setCall(session.studio.id, parsed.data);
  if (!result.ok) {
    return fail(
      result.reason === "not_found"
        ? t.errors.notFound
        : result.reason === "not_onboarding"
          ? t.errors.notOnboarding
          : t.errors.noCall,
    );
  }
  revalidatePrep(parsed.data.clientId);
  revalidatePath(clientDetailPath(parsed.data.clientId, "percorso"), "layout");
  revalidatePath(ROUTES.client.home);
  return ok();
}
