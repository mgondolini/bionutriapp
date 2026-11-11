import { describe, expect, it } from "vitest";

import {
  fitZoom,
  isCropUpscaled,
  isLogoSourceLargeEnough,
  logoDrawRect,
  logoOutputSizes,
} from "./crop";
import { checkLogoPng, readPngSize } from "./png";

/** Intestazione PNG minima con le dimensioni date. */
function pngHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  bytes.set([0, 0, 0, 13], 8);
  bytes.set(
    [...("IHDR" as string)].map((c) => c.charCodeAt(0)),
    12,
  );
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return bytes;
}

describe("ritaglio del logo", () => {
  it("adatta: il lato lungo entra nel quadrato con il margine", () => {
    expect(fitZoom({ width: 2000, height: 500 }, 0.1)).toBeCloseTo(0.2, 10);
    expect(fitZoom({ width: 800, height: 800 }, 0)).toBe(1);
  });

  it("riempi: l'area interna all'immagine finisce esattamente nel quadrato", () => {
    const rect = logoDrawRect(
      { x: 100, y: 0, width: 500, height: 500 },
      { width: 700, height: 500 },
      1000,
    );
    expect(rect).toEqual({ x: -200, y: -0, width: 1400, height: 1000 });
  });

  it("adatta: un'area più grande dell'immagine la centra con il fondo intorno", () => {
    // immagine 1000×250 in un'area di 1250 centrata
    const rect = logoDrawRect(
      { x: -125, y: -500, width: 1250, height: 1250 },
      { width: 1000, height: 250 },
      1000,
    );
    expect(rect).toEqual({ x: 100, y: 400, width: 800, height: 200 });
  });

  it("lati del PNG e soglia minima dell'immagine scelta", () => {
    expect(logoOutputSizes()).toEqual([1024, 768, 512]);
    expect(isLogoSourceLargeEnough({ width: 512, height: 300 })).toBe(true);
    expect(isLogoSourceLargeEnough({ width: 2000, height: 400 })).toBe(true);
    expect(isLogoSourceLargeEnough({ width: 500, height: 500 })).toBe(false);
    expect(isCropUpscaled({ x: 0, y: 0, width: 400, height: 400 })).toBe(true);
    expect(isCropUpscaled({ x: 0, y: 0, width: 512, height: 512 })).toBe(false);
  });
});

describe("controllo del PNG sul server", () => {
  it("legge le dimensioni dall'intestazione", () => {
    expect(readPngSize(pngHeader(1024, 768))).toEqual({
      width: 1024,
      height: 768,
    });
  });

  it("accetta solo PNG quadrati fra 512 e 1024 px", () => {
    expect(checkLogoPng(pngHeader(1024, 1024))).toBe("ok");
    expect(checkLogoPng(pngHeader(512, 512))).toBe("ok");
    expect(checkLogoPng(pngHeader(1024, 1000))).toBe("not_square");
    expect(checkLogoPng(pngHeader(256, 256))).toBe("wrong_size");
    expect(checkLogoPng(pngHeader(4096, 4096))).toBe("wrong_size");
  });

  it("rifiuta file che non sono PNG (es. un JPEG rinominato)", () => {
    const jpeg = new Uint8Array(24);
    jpeg.set([0xff, 0xd8, 0xff, 0xe0]);
    expect(checkLogoPng(jpeg)).toBe("not_png");
    expect(checkLogoPng(new Uint8Array(4))).toBe("not_png");
  });
});
