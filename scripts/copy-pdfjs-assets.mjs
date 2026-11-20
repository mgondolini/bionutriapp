/**
 * Copia in public/pdfjs gli asset di PDF.js usati dal visualizzatore dei PDF
 * (react-pdf): worker, cmaps, font standard e i decodificatori JavaScript
 * di riserva (il WebAssembly è spento: la CSP non ha 'wasm-unsafe-eval').
 * Gira dopo ogni installazione (postinstall), così la versione del worker è
 * sempre quella di pdfjs-dist installata con react-pdf. Cartella ignorata da git.
 */
import { cpSync, mkdirSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const reactPdf = dirname(require.resolve("react-pdf/package.json"));
const pdfjs = dirname(
  require.resolve("pdfjs-dist/package.json", { paths: [reactPdf] }),
);
const target = join(process.cwd(), "public", "pdfjs");

rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
cpSync(
  join(pdfjs, "build", "pdf.worker.min.mjs"),
  join(target, "pdf.worker.min.mjs"),
);
for (const dir of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
  cpSync(join(pdfjs, dir), join(target, dir), { recursive: true });
}
console.log(`[pdfjs] asset copiati in public/pdfjs`);
