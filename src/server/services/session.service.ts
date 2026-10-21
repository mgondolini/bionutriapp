import "server-only";

import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";

import { homeFor, type RouteRole } from "@/lib/auth/route-decision";
import { resolveUserContext } from "@/lib/auth/user-context";
import {
  LOCKED_JOURNEY_STAGES,
  ROUTES,
  type JourneyStage,
  type StaffRole,
} from "@/lib/constants/domain";
import { toStudioBranding, type StudioBranding } from "@/lib/studio/branding";
import * as sessionRepository from "@/server/repositories/session.repository";
import * as studioRepository from "@/server/repositories/studio.repository";

export type ClientProfile = {
  id: string;
  firstName: string;
  lastName: string | null;
  journeyStage: JourneyStage;
  /** Falso in Onboarding: file e tracking bloccati (C-09). */
  unlocked: boolean;
};

export type Session =
  | { kind: "anonymous" }
  | {
      kind: "staff";
      userId: string;
      role: StaffRole;
      displayName: string;
      studio: StudioBranding;
    }
  | {
      kind: "client";
      userId: string;
      studio: StudioBranding;
      client: ClientProfile;
    }
  | { kind: "client_disabled"; userId: string; studio: StudioBranding };

const ANONYMOUS: Session = { kind: "anonymous" };

/**
 * Legge la sessione senza memorizzarla: da usare subito dopo un cambio di
 * sessione nella stessa richiesta (login, nuova password).
 * Il ruolo si ricava SEMPRE dal database (studio_members o clients.user_id,
 * tramite my_context), mai da dati inviati dal browser.
 */
export async function loadSession(): Promise<Session> {
  const userId = await sessionRepository.getAuthUserId();
  if (!userId) return ANONYMOUS;

  const context = resolveUserContext(
    await sessionRepository.fetchUserContextRows(),
  );
  if (context.kind === "none") return ANONYMOUS;

  const studio = toStudioBranding(
    await studioRepository.getStudioBrandingBySlug(context.studioSlug),
  );

  switch (context.kind) {
    case "staff": {
      const member = await sessionRepository.getStaffMember(
        context.studioId,
        userId,
      );
      if (!member) return ANONYMOUS;
      return {
        kind: "staff",
        userId,
        role: context.role,
        displayName: member.display_name ?? member.first_name,
        studio,
      };
    }
    case "client": {
      const client = await sessionRepository.getOwnClient(context.clientId);
      if (!client) return ANONYMOUS;
      const journeyStage = client.journey_stage as JourneyStage;
      return {
        kind: "client",
        userId,
        studio,
        client: {
          id: client.id,
          firstName: client.first_name,
          lastName: client.last_name,
          journeyStage,
          unlocked: !LOCKED_JOURNEY_STAGES.includes(journeyStage),
        },
      };
    }
    case "client_disabled":
      return { kind: "client_disabled", userId, studio };
  }
}

/**
 * Sessione dell'utente corrente, letta una sola volta per richiesta.
 * `connection()` dichiara che il risultato dipende dalla richiesta: la verifica
 * del JWT usa l'ora corrente, che non può entrare nel prerender (Cache Components).
 */
export const getSession = cache(async (): Promise<Session> => {
  await connection();
  return loadSession();
});

export function routeRoleOf(session: Session): RouteRole {
  return session.kind;
}

/** Home dell'area del ruolo della sessione. */
export function homeForSession(session: Session): string {
  return homeFor(routeRoleOf(session));
}

type StaffSession = Extract<Session, { kind: "staff" }>;
type ClientSession = Extract<Session, { kind: "client" }>;
type DisabledClientSession = Extract<Session, { kind: "client_disabled" }>;

/**
 * Per le Server Actions: la sessione dello staff con lo studio, oppure null.
 * Le azioni rispondono con un errore invece di reindirizzare.
 */
export async function getStaffSession(): Promise<
  (StaffSession & { studio: { id: string } }) | null
> {
  const session = await getSession();
  if (session.kind !== "staff" || !session.studio.id) return null;
  return session as StaffSession & { studio: { id: string } };
}

/** Secondo livello di controllo (DEV-03b): chi non è staff torna alla propria area. */
export async function requireStaff(): Promise<StaffSession> {
  const session = await getSession();
  if (session.kind !== "staff") redirect(homeForSession(session));
  return session;
}

export async function requireOwner(): Promise<StaffSession> {
  const session = await requireStaff();
  if (session.role !== "owner") redirect(ROUTES.admin.home);
  return session;
}

/**
 * Cliente attivo. Con `unlocked: true` la pagina è riservata a chi ha
 * superato l'Onboarding (C-09): gli altri tornano alla home dell'area.
 */
export async function requireClient(options?: {
  unlocked?: boolean;
}): Promise<ClientSession> {
  const session = await getSession();
  if (session.kind !== "client") redirect(homeForSession(session));
  if (options?.unlocked && !session.client.unlocked)
    redirect(ROUTES.client.home);
  return session;
}

export async function requireDisabledClient(): Promise<DisabledClientSession> {
  const session = await getSession();
  if (session.kind !== "client_disabled") redirect(homeForSession(session));
  return session;
}
