/**
 * Calcoli del ritaglio del logo (funzioni pure): il browser disegna con questi
 * valori il PNG quadrato che viene caricato.
 */
import { LOGO_FIT_MARGIN, LOGO_SIZE } from "@/lib/constants/domain";

export type Size = { width: number; height: number };
/** Area ritagliata in pixel dell'immagine originale (anche oltre i bordi). */
export type CropArea = { x: number; y: number; width: number; height: number };

/**
 * Zoom che fa entrare tutta l'immagine nel quadrato con il margine: a zoom 1
 * il quadrato è il lato corto (riempi), qui diventa il lato lungo più il
 * margine.
 */
export function fitZoom(image: Size, margin = LOGO_FIT_MARGIN): number {
  const short = Math.min(image.width, image.height);
  const long = Math.max(image.width, image.height);
  return (short / long) * (1 - 2 * margin);
}

/**
 * Dove disegnare l'immagine intera in un quadrato di `output` px perché vi
 * resti esattamente l'area ritagliata. Funziona anche con un'area più grande
 * dell'immagine ("Adatta con margine"): il resto rimane del colore di fondo.
 */
export function logoDrawRect(area: CropArea, image: Size, output: number) {
  const scale = output / area.width;
  return {
    x: -area.x * scale,
    y: -area.y * scale,
    width: image.width * scale,
    height: image.height * scale,
  };
}

/** Lati da provare in ordine finché il PNG non rientra nel limite di peso. */
export function logoOutputSizes(): number[] {
  return [LOGO_SIZE.output, ...LOGO_SIZE.fallbacks];
}

/**
 * L'immagine scelta è abbastanza grande per le icone dell'app? Conta il lato
 * lungo: con "Adatta con margine" è quello che occupa l'icona (un logo con una
 * scritta lunga è largo e basso).
 */
export function isLogoSourceLargeEnough(image: Size): boolean {
  return Math.max(image.width, image.height) >= LOGO_SIZE.min;
}

/** Ritaglio che verrebbe ingrandito oltre i pixel dell'originale (icona sfocata). */
export function isCropUpscaled(area: CropArea): boolean {
  return area.width < LOGO_SIZE.min;
}
