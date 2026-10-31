/**
 * Calcoli di colore e contrasto (WCAG 2.x), funzioni pure condivise da server e client.
 */
import {
  DARK_TEXT_COLOR,
  DEFAULT_PRIMARY_COLOR,
  LIGHT_SURFACE_COLOR,
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

function toHex(channels: number[]): string {
  return `#${channels
    .map((c) => Math.round(c).toString(16).padStart(2, "0"))
    .join("")}`.toUpperCase();
}

/** Mescola il colore con il nero (`amount` da 0 a 1). */
function darken(hex: string, amount: number): string {
  const color = normalizeHexColor(hex);
  return toHex(
    [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) * (1 - amount)),
  );
}

/** Colore sovrapposto al 10% su una superficie (le "pillole" bg-primary/10). */
function tint(hex: string, surface: string, alpha: number): string {
  const a = normalizeHexColor(hex);
  const b = normalizeHexColor(surface);
  return toHex(
    [1, 3, 5].map(
      (i) =>
        parseInt(a.slice(i, i + 2), 16) * alpha +
        parseInt(b.slice(i, i + 2), 16) * (1 - alpha),
    ),
  );
}

/**
 * Colore dello studio per testi, icone e anelli del focus su sfondo chiaro
 * (--primary-ink, NF-09): il colore stesso se ha già contrasto AA con lo
 * sfondo e con le pillole bg-primary/10, altrimenti scurito quanto basta.
 * Con un colore chiaro (es. giallo) text-primary sarebbe illeggibile.
 */
export function inkColor(primaryColor: string | null | undefined): string {
  const primary = normalizeHexColor(primaryColor);
  const surfaces = [
    LIGHT_SURFACE_COLOR,
    tint(primary, LIGHT_SURFACE_COLOR, 0.1),
  ];
  for (let step = 0; step <= 20; step++) {
    const candidate = darken(primary, step * 0.05);
    if (
      surfaces.every((s) => contrastRatio(candidate, s) >= MIN_TEXT_CONTRAST)
    ) {
      return candidate;
    }
  }
  return DARK_TEXT_COLOR;
}

/**
 * Fondo dei riquadri dentro una superficie del colore dello studio (nota del
 * file in corso, C5/C7): si allontana dal testo sopra il primario, quindi il
 * contrasto con quel testo cresce sempre. Scurito se il testo è bianco,
 * schiarito se è scuro.
 */
export function deepColor(primaryColor: string | null | undefined): string {
  const primary = normalizeHexColor(primaryColor);
  return pickForeground(primary).color === LIGHT_TEXT_COLOR
    ? darken(primary, 0.18)
    : tint(primary, LIGHT_TEXT_COLOR, 0.7);
}

/** Variabili CSS del tema derivate dal colore principale dello studio. */
export function themeVariables(
  primaryColor: string | null | undefined,
): Record<string, string> {
  const primary = normalizeHexColor(primaryColor);
  const foreground = pickForeground(primary).color;
  const ink = inkColor(primary);
  return {
    "--primary": primary,
    "--primary-foreground": foreground,
    "--primary-ink": ink,
    "--primary-deep": deepColor(primary),
    // anello del focus sempre visibile (contrasto 3:1 anche con colori chiari)
    "--ring": ink,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": foreground,
  };
}
