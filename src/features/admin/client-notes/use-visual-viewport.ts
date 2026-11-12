"use client";

import { useEffect, useState } from "react";

export type ViewportBox = { height: number; offsetTop: number };

/**
 * Area visibile sopra la tastiera del telefono (visualViewport API): con
 * l'editor a tutto schermo la barra degli strumenti, in fondo, resta così
 * appena sopra la tastiera. null se disattivato o non supportato.
 */
export function useVisualViewport(enabled: boolean): ViewportBox | null {
  const [box, setBox] = useState<ViewportBox | null>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!enabled || !viewport) return;
    const update = () =>
      setBox({ height: viewport.height, offsetTop: viewport.offsetTop });
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      setBox(null);
    };
  }, [enabled]);
  return enabled ? box : null;
}
