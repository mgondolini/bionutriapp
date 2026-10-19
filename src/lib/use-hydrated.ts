"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Vero solo dopo l'idratazione. I form gestiti da JavaScript disabilitano
 * l'invio finché la pagina non è interattiva: altrimenti il browser
 * invierebbe il form da solo, con un GET che metterebbe i campi (anche la
 * password) nell'URL.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
