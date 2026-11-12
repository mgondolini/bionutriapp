/**
 * Composizione del percorso (A17, A18): onboarding sì o no, check omaggio
 * (nessuno, aggiunto o incluso) e durata decidono tipo e numero delle
 * sessioni, da 5 a 13.
 */
import {
  JOURNEY_CHECKS_BY_DURATION,
  type JourneyDuration,
  type JourneyGiftMode,
  type JourneyKind,
  type JourneySessionType,
} from "@/lib/constants/domain";

import { calculateSessionDates } from "./dates";

export type JourneyComposition = {
  durationMonths: JourneyDuration;
  includeOnboarding: boolean;
  giftMode: JourneyGiftMode;
};

export type PlannedSession = {
  position: number;
  type: JourneySessionType;
};

export type PlannedSessionWithDate = PlannedSession & {
  calculatedDate: string;
};

/**
 * Tipi nell'ordine del percorso: onboarding (se c'è), poi i check. Con
 * l'omaggio aggiunto si somma un check gratuito in testa; con l'omaggio
 * incluso il primo check del percorso diventa omaggio.
 */
export function buildSessions(
  composition: JourneyComposition,
): PlannedSession[] {
  const checks = JOURNEY_CHECKS_BY_DURATION[composition.durationMonths];
  const types: JourneySessionType[] = [];
  if (composition.includeOnboarding) types.push("onboarding");
  if (composition.giftMode === "added") {
    types.push("gift", ...Array<JourneySessionType>(checks).fill("check"));
  } else if (composition.giftMode === "included") {
    types.push("gift", ...Array<JourneySessionType>(checks - 1).fill("check"));
  } else {
    types.push(...Array<JourneySessionType>(checks).fill("check"));
  }
  return types.map((type, position) => ({ position, type }));
}

/** Sessioni con le date calcolate a partire dall'inizio. */
export function planJourney(
  composition: JourneyComposition,
  start: string,
): PlannedSessionWithDate[] {
  const sessions = buildSessions(composition);
  const dates = calculateSessionDates(
    start,
    composition.durationMonths,
    sessions.length,
  );
  return sessions.map((session, index) => ({
    ...session,
    calculatedDate: dates[index]!,
  }));
}

export type CompositionSuggestion = JourneyComposition & {
  kind: Exclude<JourneyKind, "first">;
  /** Vero se il percorso concluso è entro la soglia. */
  withinThreshold: boolean;
};

/**
 * Impostazioni iniziali di "Estendi o riprendi" (A18): entro la soglia
 * estensione senza onboarding e con omaggio aggiunto; oltre, ripresa con
 * onboarding e senza omaggio. La durata resta quella del percorso concluso.
 */
export function suggestComposition(
  daysSinceConcluded: number,
  threshold: number,
  previousDuration: JourneyDuration = 6,
): CompositionSuggestion {
  const withinThreshold = daysSinceConcluded <= threshold;
  return withinThreshold
    ? {
        kind: "extension",
        includeOnboarding: false,
        giftMode: "added",
        durationMonths: previousDuration,
        withinThreshold,
      }
    : {
        kind: "resume",
        includeOnboarding: true,
        giftMode: "none",
        durationMonths: previousDuration,
        withinThreshold,
      };
}
