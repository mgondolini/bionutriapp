/**
 * Scala delle abitudini ancorata all'obiettivo (T-07, tabella "Scala delle
 * abitudini giornaliere"): 5 obiettivo raggiunto, 4 ≈ 75%, 3 ≈ 50%,
 * 2 ≈ 25%, 1 meno del 25%, con valori arrotondati in modo leggibile.
 */
import {
  DEFAULT_GOAL_ROUNDING,
  HABIT_GOAL_ROUNDING,
  HABIT_SCORES,
  HABIT_SCORE_SHARES,
  HOURS_GOAL_UNIT,
  type HabitKey,
  type HabitScore,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatNumber } from "@/lib/format";

const t = copy.tracking.scale;

function roundingFor(metricKey: string): number {
  return metricKey in HABIT_GOAL_ROUNDING
    ? HABIT_GOAL_ROUNDING[metricKey as HabitKey]
    : DEFAULT_GOAL_ROUNDING;
}

/** Al multiplo di `step` più vicino, mai zero (un valore "circa 0" non dice nulla). */
export function roundToStep(value: number, step: number): number {
  // toFixed toglie i residui della divisione (2,25 / 0,1 = 22,4999…)
  const steps = Math.round(Number((value / step).toFixed(6)));
  const rounded = Number((steps * step).toFixed(4));
  return rounded > 0 ? rounded : step;
}

/** "2 L", "8.000 passi", "7 ore e mezza", "1 ora", "mezz'ora". */
export function formatGoalAmount(value: number, unit: string): string {
  if (unit !== HOURS_GOAL_UNIT) return t.amount(formatNumber(value), unit);
  const whole = Math.floor(value);
  const half = value - whole >= 0.5;
  if (whole === 0) return half ? t.halfHour : t.hours(0);
  return half ? t.hoursAndHalf(whole) : t.hours(whole);
}

export type ScaleRow = {
  score: HabitScore;
  meaning: string;
  /** "2 L o più", "circa 1,5 L", "meno di 0,5 L". */
  amount: string;
};

/** Le 5 righe della scala, dal voto più alto, per l'obiettivo effettivo del cliente. */
export function habitScale(
  metricKey: string,
  goal: number,
  goalUnit: string,
): ScaleRow[] {
  const step = roundingFor(metricKey);
  return HABIT_SCORES.map((score) => {
    const share = HABIT_SCORE_SHARES[score];
    const amount = formatGoalAmount(
      score === 5 ? goal : roundToStep(goal * share, step),
      goalUnit,
    );
    return {
      score,
      meaning: t.meanings[score],
      amount:
        score === 5
          ? t.atLeast(amount)
          : score === 1
            ? t.lessThan(amount)
            : t.about(amount),
    };
  });
}
