/**
 * Calcoli di colore e contrasto (WCAG 2.x), funzioni pure condivise da server e client.
 */
import {
  APP_BACKGROUND_COLOR,
  DARK_TEXT_COLOR,
  DEFAULT_PRIMARY_COLOR,
  LIGHT_TEXT_COLOR,
  MIN_TEXT_CONTRAST,
  SIDEBAR_ACTIVE_COLOR,
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

/**
 * Colore dello studio per testi, icone e anelli del focus su sfondo chiaro
 * (--primary-ink, NF-09): il colore stesso se ha già contrasto AA con lo
 * sfondo e con le pillole della tinta, altrimenti scurito quanto basta.
 * Con un colore chiaro (es. giallo) text-primary sarebbe illeggibile.
 */
export function inkColor(primaryColor: string | null | undefined): string {
  const primary = normalizeHexColor(primaryColor);
  const surfaces = [APP_BACKGROUND_COLOR, tintColor(primary)];
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

function toHsl(hex: string): [number, number, number] {
  const color = normalizeHexColor(hex);
  const [r, g, b] = [1, 3, 5].map(
    (i) => parseInt(color.slice(i, i + 2), 16) / 255,
  );
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h =
    max === r
      ? ((g - b) / d + (g < b ? 6 : 0)) * 60
      : max === g
        ? ((b - r) / d + 2) * 60
        : ((r - g) / d + 4) * 60;
  return [h, s, l];
}

function fromHsl(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  return toHex([r, g, b].map((v) => (v + m) * 255));
}

/**
 * Tonalità chiara del colore dello studio: stessa tinta, saturazione
 * contenuta (un grigio resta grigio), luminosità fissa.
 */
function lightShade(
  primaryColor: string,
  lightness: number,
  maxSaturation: number,
): string {
  const [h, s] = toHsl(primaryColor);
  return fromHsl(h, Math.min(s, maxSaturation), lightness);
}

/**
 * Menta (mockup v2): superfici in evidenza dell'area cliente (file in corso,
 * check-in), badge "In percorso" e "Nuovo", voce attiva del menu laterale.
 * Sopra si scrive sempre con il testo scuro (#1F3A34 su #98E2C6 = 8,2:1) ed
 * è il testo della voce attiva del menu scuro: se una tinta (blu, viola) non
 * raggiunge 4,5:1 con entrambi, si schiarisce.
 */
export function mintColor(primaryColor: string | null | undefined): string {
  const primary = normalizeHexColor(primaryColor);
  for (let lightness = 0.74; lightness < 0.95; lightness += 0.02) {
    const candidate = lightShade(primary, lightness, 0.56);
    if (
      [DARK_TEXT_COLOR, SIDEBAR_ACTIVE_COLOR].every(
        (surface) => contrastRatio(candidate, surface) >= MIN_TEXT_CONTRAST,
      )
    ) {
      return candidate;
    }
  }
  return lightShade(primary, 0.95, 0.56);
}

/**
 * Verde azione dell'area admin (mockup-v2-admin, `--azione`): pulsanti
 * primari con il testo Profondo sopra. Stessa tinta del colore dello studio,
 * schiarita quanto basta per 4,5:1 con il testo (il #2FA582 del mockup arriva
 * a 3,98:1); al passaggio del mouse il pulsante diventa Profondo con testo bianco.
 */
export function actionColor(primaryColor: string | null | undefined): string {
  const primary = normalizeHexColor(primaryColor);
  for (let lightness = 0.42; lightness < 0.9; lightness += 0.01) {
    const candidate = lightShade(primary, lightness, 0.56);
    if (contrastRatio(candidate, DARK_TEXT_COLOR) >= MIN_TEXT_CONTRAST) {
      return candidate;
    }
  }
  return lightShade(primary, 0.9, 0.56);
}

/**
 * Tinta dell'area admin (mockup-v2-admin, `--tinta` #E1EFEB): più neutra
 * della tinta del cliente. Voce attiva del menu, intestazione delle tabelle,
 * chip "Attivo", pill selezionata.
 */
export function washColor(primaryColor: string | null | undefined): string {
  return lightShade(normalizeHexColor(primaryColor), 0.91, 0.25);
}

/** Tinta (mockup v2): fondo tenue del primario per badge, pillole e voce attiva. */
export function tintColor(primaryColor: string | null | undefined): string {
  return lightShade(normalizeHexColor(primaryColor), 0.875, 0.5);
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
    "--primary-tint": tintColor(primary),
    "--mint": mintColor(primary),
    "--action": actionColor(primary),
    "--wash": washColor(primary),
    // anello del focus sempre visibile (contrasto 3:1 anche con colori chiari)
    "--ring": ink,
    "--sidebar-primary": primary,
    "--sidebar-primary-foreground": foreground,
  };
}
