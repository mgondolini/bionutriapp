import { describe, expect, it } from "vitest";

import {
  SPLASH_SCREENS,
  findSplashSize,
  splashMedia,
  splashPath,
} from "./splash";

describe("schermate di avvio iOS", () => {
  const iphone15 = { width: 393, height: 852, pixelRatio: 3 };

  it("costruisce percorso e media query dai punti dello schermo", () => {
    expect(splashPath(iphone15)).toBe("/splash/1179x2556");
    expect(splashMedia(iphone15)).toBe(
      "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)",
    );
  });

  it("accetta solo le dimensioni dell'elenco", () => {
    expect(findSplashSize("1179x2556")).toEqual({ width: 1179, height: 2556 });
    expect(findSplashSize("1000x1000")).toBeNull();
    expect(findSplashSize("../../etc")).toBeNull();
    expect(findSplashSize("99999x99999")).toBeNull();
  });

  it("non ha due schermi con la stessa immagine", () => {
    const paths = SPLASH_SCREENS.map(splashPath);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
