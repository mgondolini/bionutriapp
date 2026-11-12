/**
 * Check con le foto (FOTO-02): un set ogni 3 check, ai check 3, 6 e 9 con
 * il percorso di 1 anno, solo al 3 con quello di 6 mesi (l'ultimo check è
 * il 5). Numerazione del cliente: l'omaggio conta come un check qualsiasi.
 * La stessa regola è private.is_photo_check() nel database
 * (20261117000000_foto.sql): vanno cambiate insieme.
 */
import {
  PHOTO_CHECK_INTERVAL,
  type JourneySessionType,
} from "@/lib/constants/domain";

/** Numeri dei check con le foto: multipli di 3 minori della durata in mesi. */
export function getPhotoCheckNumbers(durationMonths: number): number[] {
  const numbers: number[] = [];
  for (
    let check = PHOTO_CHECK_INTERVAL;
    check < durationMonths;
    check += PHOTO_CHECK_INTERVAL
  ) {
    numbers.push(check);
  }
  return numbers;
}

export function isPhotoCheck(checkNumber: number, durationMonths: number) {
  return getPhotoCheckNumbers(durationMonths).includes(checkNumber);
}

type SessionRef = {
  id: string;
  position: number;
  type: JourneySessionType;
};

/**
 * Sessioni di UN percorso che prevedono le foto, con il numero del check
 * come lo vede il cliente (onboarding escluso, omaggio compreso).
 */
export function photoSessionsOfJourney<T extends SessionRef>(
  sessions: readonly T[],
  durationMonths: number,
): { session: T; checkNumber: number }[] {
  const photoChecks = new Set(getPhotoCheckNumbers(durationMonths));
  const out: { session: T; checkNumber: number }[] = [];
  let number = 0;
  for (const session of [...sessions].sort((a, b) => a.position - b.position)) {
    if (session.type === "onboarding") continue;
    number += 1;
    if (photoChecks.has(number)) out.push({ session, checkNumber: number });
  }
  return out;
}
