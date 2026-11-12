/**
 * Controlli sulle immagini, puri: dimensioni dopo il ridimensionamento,
 * formato in ingresso e verifica del JPEG caricato (firma e assenza di
 * metadati come EXIF e posizione GPS). Li usano il browser (prima della
 * conversione) e il server (alla conferma del caricamento).
 */
import {
  PHOTO_INPUT_TYPES,
  PHOTO_MAX_INPUT_BYTES,
  PHOTO_MAX_SIDE,
} from "@/lib/constants/domain";

/** Dimensioni entro `max` sul lato lungo, senza ingrandire. */
export function fitWithin(
  width: number,
  height: number,
  max: number = PHOTO_MAX_SIDE,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height };
  const scale = max / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export type PhotoInputError = "too_large" | "unsupported";

/**
 * Il tipo dichiarato può mancare (HEIC su alcuni sistemi): allora conta
 * l'estensione del nome.
 */
export function isHeic(file: { type: string; name: string }): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.(heic|heif)$/i.test(file.name)
  );
}

export function checkPhotoInput(file: {
  type: string;
  name: string;
  size: number;
}): PhotoInputError | null {
  const accepted =
    (PHOTO_INPUT_TYPES as readonly string[]).includes(file.type) ||
    isHeic(file) ||
    (file.type === "" && /\.(jpe?g|png)$/i.test(file.name));
  if (!accepted) return "unsupported";
  if (file.size > PHOTO_MAX_INPUT_BYTES) return "too_large";
  return null;
}

/** Un JPEG inizia con FF D8 FF. */
export function hasJpegSignature(bytes: Uint8Array): boolean {
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

/** Segmenti APPn con metadati: APP1 (EXIF, XMP), APP13 (IPTC). */
const METADATA_MARKERS = new Set([0xe1, 0xed]);

/**
 * Vero se fra i segmenti che precedono l'immagine (fino a SOS) c'è un
 * blocco di metadati. Il JPEG ridisegnato dal browser non ne ha: uno che
 * li contiene non è passato dalla conversione (e potrebbe avere il GPS).
 * Se l'intestazione letta finisce prima di SOS, vale come "con metadati":
 * meglio rifiutare che lasciar passare.
 */
export function jpegHasMetadata(bytes: Uint8Array): boolean {
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset] !== 0xff) return true;
    const marker = bytes[offset + 1]!;
    // riempimento: più 0xFF di seguito
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    // inizio dei dati dell'immagine
    if (marker === 0xda) return false;
    if (METADATA_MARKERS.has(marker)) return true;
    const length = (bytes[offset + 2]! << 8) | bytes[offset + 3]!;
    if (length < 2) return true;
    offset += 2 + length;
  }
  return true;
}
