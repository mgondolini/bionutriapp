/**
 * Calcoli di colore e contrasto (WCAG 2.x), funzioni pure condivise da server e client.
 */
import {
  DARK_TEXT_COLOR,
  DEFAULT_PRIMARY_COLOR,
  LIGHT_TEXT_COLOR,
  MIN_TEXT_CONTRAST,
} from "@/lib/constants/domain";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

/** Colore valido in maiuscolo, oppure il colore predefinito. */
export function normalizeHexColor(value: string | null | undefined): string {
  return value && isHexColor(value)
    ? value.toUpperCase()
    : DEFAULT_PRIMARY_COLOR;
}

function channelToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminanza relativa WCAG di un colore #RRGGBB. */
export function relativeLuminance(hex: string): number {
  const color = normalizeHexColor(hex);
  const r = parseInt(color.slice(1, 3), 16);
  const g = parseInt(color.slice(3, 5), 16);
  const b = parseInt(color.slice(5, 7), 16);
  return (
    0.2126 * channelToLinear(r) +
    0.7152 * channelToLinear(g) +
    0.0722 * channelToLinear(b)
  );
}

/** Rapporto di contrasto WCAG fra due colori (da 1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

export type ForegroundChoice = {
  /** Colore del testo da usare sopra lo sfondo. */
  color: string;
  /** "light" = testo bianco, "dark" = testo scuro del design system. */
  tone: "light" | "dark";
  ratio: number;
  /** Vero se il contrasto rispetta WCAG AA (4,5:1). */
  meetsAA: boolean;
};

/** Sceglie fra testo bianco e testo scuro quello con il contrasto maggiore sullo sfondo. */
export function pickForeground(background: string): ForegroundChoice {
  const light = contrastRatio(background, LIGHT_TEXT_COLOR);
  const dark = contrastRatio(background, DARK_TEXT_COLOR);
  const useLight = light >= dark;
  const ratio = useLight ? light : dark;
  return {
    color: useLight ? LIGHT_TEXT_COLOR : DARK_TEXT_COLOR,
    tone: useLight ? "light" : "dark",
    ratio,
    meetsAA: ratio >= MIN_TEXT_CONTRAST,
  };
}

/**
 * Rapporto formattato all'italiana con una cifra decimale (es. "6,4").
 * Solo per la visualizzazione: la conformità AA usa sempre il valore esatto.
 */
export function formatRatio(ratio: number): string {
  return ratio.toLocaleString("it-IT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

/** Variabili CSS del tema derivate dal colore principale dello studio. */
export function themeVariables(
  primaryColor: string | null | undefined,
): Record<string, string> {
  const primary = normalizeHexColor(primaryColor);
  const foreground = pickForeground(primary).color;
  return {
    "--primary": primary,
    "--primary-foreground": foreground,
    "--ring": primary,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": foreground,
  };
}
