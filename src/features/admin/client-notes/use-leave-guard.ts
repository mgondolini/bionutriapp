"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Con modifiche non salvate chiede conferma prima di lasciare la nota:
 * ricarica o chiusura della scheda (beforeunload) e clic su link interni o
 * su pulsanti marcati `data-leave-guard` (es. "Nuova nota"). Il controllo
 * gira in cattura sul documento, prima dei gestori di React e di Link.
 * `release()` lo disattiva per un'uscita voluta (Ricarica, nota eliminata).
 */
export function useLeaveGuard(dirty: boolean, message: string): () => void {
  const released = useRef(false);
  useEffect(() => {
    if (!dirty) return;
    released.current = false;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!released.current) event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      if (released.current) return;
      if (event.defaultPrevented || event.button !== 0) return;
      const target = (event.target as Element | null)?.closest(
        "a[href], [data-leave-guard]",
      );
      if (!target) return;
      if (target instanceof HTMLAnchorElement) {
        if (target.target === "_blank" || target.hasAttribute("download")) {
          return;
        }
        const url = new URL(target.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname) return;
      }
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, message]);
  return useCallback(() => {
    released.current = true;
  }, []);
}
