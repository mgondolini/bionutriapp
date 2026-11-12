/**
 * Testi del percorso ricavati dai dati: nome della sessione, intervalli di
 * date. Le parole stanno in copy.journeys (DEV-14).
 */
import { copy } from "@/lib/copy/it";
import {
  formatDayMonthLong,
  formatDayMonthShort,
  formatLongDate,
  formatShortDate,
} from "@/lib/format";

import type { SessionName } from "./sessions";

const t = copy.journeys;

export function sessionLabel(name: SessionName): string {
  if (name.kind === "onboarding") return t.sessionName.onboarding;
  if (name.kind === "gift") return t.sessionName.gift;
  return t.sessionName.check(name.number);
}

/**
 * "20 apr – 20 ott 2026", "12 nov 2026 – 12 mag 2027"; con `long` i mesi
 * per esteso ("14 aprile – 25 agosto 2026").
 */
export function dateRange(
  start: string,
  end: string,
  style: "short" | "long" = "short",
): string {
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  const full = style === "long" ? formatLongDate : formatShortDate;
  const noYear = style === "long" ? formatDayMonthLong : formatDayMonthShort;
  return `${sameYear ? noYear(start) : full(start)} – ${full(end)}`;
}
