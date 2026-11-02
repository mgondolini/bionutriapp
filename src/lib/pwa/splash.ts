import { SPLASH_PATH } from "@/lib/constants/domain";

/**
 * Schermate di avvio dell'app installata su iPhone e iPad (C-06): iOS non le
 * ricava dal manifest, vuole un'immagine per ogni dimensione dello schermo.
 * Android le disegna da sé con icona, nome e background_color del manifest.
 */

export type SplashScreen = {
  /** Punti CSS dello schermo in verticale. */
  width: number;
  height: number;
  pixelRatio: number;
};

/** iPhone e iPad in verticale (l'app è `orientation: portrait`). */
export const SPLASH_SCREENS: readonly SplashScreen[] = [
  { width: 440, height: 956, pixelRatio: 3 }, // 16 Pro Max
  { width: 402, height: 874, pixelRatio: 3 }, // 16 Pro
  { width: 430, height: 932, pixelRatio: 3 }, // 14/15 Pro Max, 15/16 Plus
  { width: 393, height: 852, pixelRatio: 3 }, // 14 Pro, 15, 15 Pro, 16
  { width: 428, height: 926, pixelRatio: 3 }, // 12/13 Pro Max, 14 Plus
  { width: 390, height: 844, pixelRatio: 3 }, // 12, 13, 14
  { width: 375, height: 812, pixelRatio: 3 }, // X, XS, 11 Pro, 12/13 mini
  { width: 414, height: 896, pixelRatio: 3 }, // XS Max, 11 Pro Max
  { width: 414, height: 896, pixelRatio: 2 }, // XR, 11
  { width: 414, height: 736, pixelRatio: 3 }, // 6/7/8 Plus
  { width: 375, height: 667, pixelRatio: 2 }, // SE, 6/7/8
  { width: 1024, height: 1366, pixelRatio: 2 }, // iPad Pro 12,9"
  { width: 834, height: 1194, pixelRatio: 2 }, // iPad Pro 11"
  { width: 820, height: 1180, pixelRatio: 2 }, // iPad Air
  { width: 768, height: 1024, pixelRatio: 2 }, // iPad
];

/** Pixel reali dell'immagine. */
export function splashPixels(screen: SplashScreen): {
  width: number;
  height: number;
} {
  return {
    width: screen.width * screen.pixelRatio,
    height: screen.height * screen.pixelRatio,
  };
}

/** Percorso dell'immagine: `/splash/1179x2556`. */
export function splashPath(screen: SplashScreen): string {
  const { width, height } = splashPixels(screen);
  return `${SPLASH_PATH}/${width}x${height}`;
}

/** Media query che fa scegliere a iOS l'immagine giusta. */
export function splashMedia(screen: SplashScreen): string {
  return `(device-width: ${screen.width}px) and (device-height: ${screen.height}px) and (-webkit-device-pixel-ratio: ${screen.pixelRatio}) and (orientation: portrait)`;
}

/** Dimensione richiesta dall'URL, solo se è tra quelle note (le altre: 404). */
export function findSplashSize(
  size: string,
): { width: number; height: number } | null {
  const match = /^(\d{3,4})x(\d{3,4})$/.exec(size);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  return SPLASH_SCREENS.some((screen) => {
    const pixels = splashPixels(screen);
    return pixels.width === width && pixels.height === height;
  })
    ? { width, height }
    : null;
}
