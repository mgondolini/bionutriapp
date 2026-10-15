import { themeVariables } from "@/lib/color";

/**
 * Sovrascrive le variabili del tema shadcn con il colore dello studio (A-14).
 * Il colore del testo sopra il primario è calcolato per il contrasto WCAG AA.
 */
export function StudioThemeStyle({ primaryColor }: { primaryColor: string }) {
  const declarations = Object.entries(themeVariables(primaryColor))
    .map(([name, value]) => `${name}:${value};`)
    .join("");
  const css = `:root{${declarations}}`;
  return <style>{css}</style>;
}
