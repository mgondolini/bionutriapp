/**
 * Testi composti del tracking (valori con unità, confronti), condivisi da
 * cliente e staff. Funzioni pure: i testi vengono da copy (DEV-14).
 */
import { MEASURE_DECIMALS } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import {
  formatDayMonthShort,
  formatDecimal,
  formatSignedDelta,
} from "@/lib/format";

const t = copy.tracking;

/** "77,0 cm" */
export function measureText(value: number, unit: string | null): string {
  return t.valueWithUnit(formatDecimal(value, MEASURE_DECIMALS), unit);
}

/** "8/10" */
export function scoreText(value: number, max: number): string {
  return t.score(value, max);
}

/** "4,3" (media con un decimale) */
export function averageText(value: number): string {
  return formatDecimal(value, 1);
}

/**
 * "+0,6 rispetto alla scorsa settimana", "uguale alla scorsa settimana";
 * null se manca una delle due settimane (nessun confronto).
 */
export function habitDeltaText(
  delta: number | null,
  short = false,
): string | null {
  if (delta === null) return null;
  if (delta === 0) return t.deltaZero;
  const value = formatSignedDelta(delta);
  return short ? t.deltaShort(value) : t.delta(value);
}

/** "12–18 ott", "28 set – 4 ott": intervallo di una settimana. */
export function weekRangeText(from: string, to: string): string {
  const start = formatDayMonthShort(from);
  const end = formatDayMonthShort(to);
  const [startDay, startMonth] = start.split(" ");
  return startMonth === end.split(" ")[1]
    ? `${startDay}–${end}`
    : `${start} – ${end}`;
}
