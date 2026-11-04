/**
 * Controllo del logo caricato sul server, senza librerie: firma PNG e
 * dimensioni dall'intestazione IHDR (primi 24 byte).
 */
import { LOGO_SIZE } from "@/lib/constants/domain";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
/** Byte da leggere per firma e dimensioni. */
export const PNG_HEADER_BYTES = 24;

export function readPngSize(
  bytes: Uint8Array,
): { width: number; height: number } | null {
  if (bytes.length < PNG_HEADER_BYTES) return null;
  if (PNG_SIGNATURE.some((byte, i) => bytes[i] !== byte)) return null;
  // il primo blocco deve essere IHDR
  if (String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR") return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

export type LogoPngCheck = "ok" | "not_png" | "not_square" | "wrong_size";

/** Il logo salvato è sempre un PNG quadrato fra 512 e 1024 px di lato. */
export function checkLogoPng(bytes: Uint8Array): LogoPngCheck {
  const size = readPngSize(bytes);
  if (!size) return "not_png";
  if (size.width !== size.height) return "not_square";
  if (size.width < LOGO_SIZE.min || size.width > LOGO_SIZE.output)
    return "wrong_size";
  return "ok";
}
