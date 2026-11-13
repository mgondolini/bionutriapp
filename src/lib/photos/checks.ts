/**
 * Check con le foto (FOTO-02): la foto di partenza all'onboarding, poi un
 * set ogni 3 check e uno all'ultimo check del percorso, quando si rifanno
 * anche le misure (decisione del 13 novembre 2026). Con il percorso di 1
 * anno ai check 3, 6, 9 e 11, con quello di 6 mesi ai check 3 e 5; con
 * l'omaggio aggiunto l'ultimo è il 12 (o il 6). Numerazione del cliente:
 * l'omaggio conta come un check qualsiasi. La stessa regola è
 * private.is_photo_check() nel database (20261119000000_foto_ultimo_check.sql):
 * vanno cambiate insieme.
 */
import {
  PHOTO_CHECK_INTERVAL,
  type JourneySessionType,
} from "@/lib/constants/domain";

/** Numeri dei check con le foto: multipli di 3 prima dell'ultimo, più l'ultimo. */
export function getPhotoCheckNumbers(lastCheck: number): number[] {
  const numbers: number[] = [];
  for (
    let check = PHOTO_CHECK_INTERVAL;
    check < lastCheck;
    check += PHOTO_CHECK_INTERVAL
  ) {
    numbers.push(check);
  }
  if (lastCheck > 0) numbers.push(lastCheck);
  return numbers;
}

export function isPhotoCheck(checkNumber: number, lastCheck: number) {
  return getPhotoCheckNumbers(lastCheck).includes(checkNumber);
}

type SessionRef = {
  id: string;
  position: number;
  type: JourneySessionType;
};

/**
 * Sessioni di UN percorso che prevedono le foto: l'onboarding (foto di
 * partenza, `checkNumber` null) e i check della regola, con il numero come
 * lo vede il cliente (onboarding escluso, omaggio compreso). Nel database
 * è private.is_photo_session().
 */
export function photoSessionsOfJourney<T extends SessionRef>(
  sessions: readonly T[],
): { session: T; checkNumber: number | null }[] {
  const lastCheck = sessions.filter((s) => s.type !== "onboarding").length;
  const photoChecks = new Set(getPhotoCheckNumbers(lastCheck));
  const out: { session: T; checkNumber: number | null }[] = [];
  let number = 0;
  for (const session of [...sessions].sort((a, b) => a.position - b.position)) {
    if (session.type === "onboarding") {
      out.push({ session, checkNumber: null });
      continue;
    }
    number += 1;
    if (photoChecks.has(number)) out.push({ session, checkNumber: number });
  }
  return out;
}
