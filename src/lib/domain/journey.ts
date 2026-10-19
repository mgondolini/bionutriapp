/**
 * Fasi del percorso (ST-01…ST-04): transizioni consentite come funzioni pure,
 * usate dall'interfaccia (quali pulsanti mostrare) e dalle Server Actions
 * (cosa accettare). La stessa tabella è ricontrollata dal database in
 * public.set_journey_stage, come seconda barriera.
 * Lo stato dell'account non c'entra: fase e stato cambiano in modo indipendente (ST-01).
 */
import {
  INITIAL_STAGE_BY_ORIGIN,
  type ClientOrigin,
  type JourneyStage,
  type StageSource,
} from "@/lib/constants/domain";

export const JOURNEY_TRANSITIONS: Readonly<
  Record<JourneyStage, readonly JourneyStage[]>
> = {
  onboarding: ["in_progress"],
  in_progress: ["paused", "completed"],
  paused: ["in_progress", "completed"],
  completed: ["in_progress"],
};

/** Azioni dell'interfaccia: lo stesso arrivo ha un nome diverso a seconda della partenza. */
export type JourneyAction =
  "complete_onboarding" | "pause" | "complete" | "resume";

export function canTransition(from: JourneyStage, to: JourneyStage): boolean {
  return JOURNEY_TRANSITIONS[from].includes(to);
}

export function allowedTransitions(
  from: JourneyStage,
): readonly JourneyStage[] {
  return JOURNEY_TRANSITIONS[from];
}

export function actionFor(from: JourneyStage, to: JourneyStage): JourneyAction {
  if (from === "onboarding") return "complete_onboarding";
  if (to === "paused") return "pause";
  if (to === "completed") return "complete";
  return "resume";
}

/** Pulsanti da mostrare nella scheda cliente per la fase corrente. */
export function availableActions(
  from: JourneyStage,
): { to: JourneyStage; action: JourneyAction }[] {
  return allowedTransitions(from).map((to) => ({
    to,
    action: actionFor(from, to),
  }));
}

export type StageChange = {
  from: JourneyStage;
  to: JourneyStage;
  source: StageSource;
};

export type StageChangePlan =
  | { ok: true; change: StageChange }
  | { ok: false; reason: "same_stage" | "not_allowed" };

/**
 * Verifica un cambio di fase. `source` "manual" per i pulsanti dello staff,
 * "automatic" per i cambi del sistema (v2.0: appuntamento di onboarding
 * completato, ST-03), che il database registra senza autore.
 */
export function planStageChange(
  from: JourneyStage,
  to: JourneyStage,
  source: StageSource = "manual",
): StageChangePlan {
  if (from === to) return { ok: false, reason: "same_stage" };
  if (!canTransition(from, to)) return { ok: false, reason: "not_allowed" };
  return { ok: true, change: { from, to, source } };
}

/** Fase con cui il cliente entra all'attivazione (decisa dall'origine). */
export function stageOnActivation(origin: ClientOrigin): JourneyStage {
  return INITIAL_STAGE_BY_ORIGIN[origin];
}
