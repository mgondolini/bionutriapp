"use client";

import { useSyncExternalStore } from "react";

/** Sotto `md` di Tailwind (768 px): telefono. */
export const PHONE_MEDIA_QUERY = "(max-width: 767.98px)";

/**
 * Stato di una media query del browser. Sul server e durante l'idratazione
 * vale `false` (desktop): va usato solo per ciò che compare dopo
 * un'interazione, come un pannello che si apre al tocco.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
