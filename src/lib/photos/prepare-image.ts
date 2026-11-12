/**
 * Preparazione della foto nel browser, prima del caricamento (FOTO-10):
 * orientamento EXIF applicato, HEIC convertito, lato lungo a 2000 px, JPEG
 * qualità 0,85. Il ridisegno su canvas non copia i metadati: posizione GPS,
 * modello del telefono e data di scatto non lasciano mai il dispositivo.
 * Solo browser (canvas, createImageBitmap).
 */
import {
  PHOTO_JPEG_QUALITY,
  PHOTO_MAX_UPLOAD_BYTES,
  PHOTO_UPLOAD_TYPE,
} from "@/lib/constants/domain";

import { checkPhotoInput, fitWithin, isHeic } from "./image";

export type PreparePhotoError = "too_large" | "unsupported" | "decode_failed";

export class PhotoPrepareError extends Error {
  constructor(readonly code: PreparePhotoError) {
    super(code);
  }
}

type Decoded = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
};

async function decode(blob: Blob): Promise<Decoded | null> {
  try {
    const bitmap = await createImageBitmap(blob, {
      imageOrientation: "from-image",
    });
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  } catch {
    // ripiego: l'elemento img applica anch'esso l'orientamento EXIF
  }
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** HEIC che il browser non sa aprire (tutti tranne Safari): libreria caricata solo ora. */
async function heicToJpeg(file: Blob): Promise<Blob | null> {
  try {
    const { default: heic2any } = await import("heic2any");
    const converted = await heic2any({
      blob: file,
      toType: PHOTO_UPLOAD_TYPE,
      quality: 0.92,
    });
    return Array.isArray(converted) ? (converted[0] ?? null) : converted;
  } catch {
    return null;
  }
}

export async function prepareImage(file: File): Promise<Blob> {
  const inputError = checkPhotoInput(file);
  if (inputError) throw new PhotoPrepareError(inputError);

  let decoded = await decode(file);
  if (!decoded && isHeic(file)) {
    const jpeg = await heicToJpeg(file);
    if (jpeg) decoded = await decode(jpeg);
  }
  if (!decoded) throw new PhotoPrepareError("decode_failed");

  const { width, height } = fitWithin(decoded.width, decoded.height);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new PhotoPrepareError("decode_failed");
  context.imageSmoothingQuality = "high";
  context.drawImage(decoded.source, 0, 0, width, height);
  decoded.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, PHOTO_UPLOAD_TYPE, PHOTO_JPEG_QUALITY),
  );
  if (!blob) throw new PhotoPrepareError("decode_failed");
  if (blob.size > PHOTO_MAX_UPLOAD_BYTES)
    throw new PhotoPrepareError("too_large");
  return blob;
}
