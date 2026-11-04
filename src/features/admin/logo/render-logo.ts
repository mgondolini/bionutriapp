import { LOGO_MAX_BYTES, LIGHT_TEXT_COLOR } from "@/lib/constants/domain";
import {
  logoDrawRect,
  logoOutputSizes,
  type CropArea,
  type Size,
} from "@/lib/logo/crop";

/** Carica un'immagine (URL temporaneo del file scelto) e ne attende la decodifica. */
export async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

export function imageSize(image: HTMLImageElement): Size {
  return { width: image.naturalWidth, height: image.naturalHeight };
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))),
      "image/png",
    ),
  );
}

/** Quadrato di `size` px con l'area ritagliata su fondo bianco (come le icone). */
export function drawLogo(
  image: HTMLImageElement,
  area: CropArea,
  size: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas 2d");
  context.fillStyle = LIGHT_TEXT_COLOR;
  context.fillRect(0, 0, size, size);
  context.imageSmoothingQuality = "high";
  const rect = logoDrawRect(area, imageSize(image), size);
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height);
  return canvas;
}

/**
 * PNG del logo da caricare: 1024 px, oppure un lato più piccolo se il file
 * supererebbe il limite del bucket (foto molto dettagliate).
 */
export async function exportLogo(
  image: HTMLImageElement,
  area: CropArea,
): Promise<File> {
  for (const size of logoOutputSizes()) {
    const blob = await toBlob(drawLogo(image, area, size));
    if (blob.size <= LOGO_MAX_BYTES) {
      return new File([blob], "logo.png", { type: "image/png" });
    }
  }
  throw new Error("logo troppo pesante anche al lato minimo");
}
