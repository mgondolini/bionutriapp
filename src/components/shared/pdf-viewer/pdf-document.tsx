"use client";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import { PDF_MAX_PIXEL_RATIO, PDFJS_ASSETS_PATH } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

const t = copy.files.viewer;

// Nello stesso modulo dei componenti di react-pdf (README di react-pdf):
// worker servito dal sito (CSP worker-src 'self'), stessa versione di pdfjs-dist.
pdfjs.GlobalWorkerOptions.workerSrc = `${PDFJS_ASSETS_PATH}/pdf.worker.min.mjs`;

/**
 * Opzioni di PDF.js:
 * - un solo download completo (niente richieste a intervalli): l'URL
 *   firmato scade dopo 60 secondi, una richiesta successiva fallirebbe;
 * - niente WebAssembly né eval: la CSP non li permette, PDF.js usa i
 *   decodificatori JavaScript di riserva;
 * - cmaps e font standard dal sito, per i PDF senza font incorporati.
 */
const OPTIONS = {
  cMapUrl: `${PDFJS_ASSETS_PATH}/cmaps/`,
  cMapPacked: true,
  standardFontDataUrl: `${PDFJS_ASSETS_PATH}/standard_fonts/`,
  wasmUrl: `${PDFJS_ASSETS_PATH}/wasm/`,
  iccUrl: `${PDFJS_ASSETS_PATH}/iccs/`,
  useWasm: false,
  isEvalSupported: false,
  disableRange: true,
  disableStream: true,
  disableAutoFetch: true,
};

/** Larghezza del contenitore, per disegnare le pagine a tutta larghezza. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>();
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { ref, width };
}

/**
 * Tutte le pagine una sotto l'altra, con lo strato del testo e quello dei
 * link: un link interno porta alla sua pagina (react-pdf la trova tra quelle
 * disegnate), un link esterno si apre in una nuova scheda.
 */
export default function PdfDocument({
  url,
  onError,
  onPages,
}: {
  url: string;
  onError: () => void;
  onPages?: (count: number) => void;
}) {
  const { ref, width } = useWidth();
  const [pages, setPages] = useState(0);
  const file = useMemo(() => ({ url }), [url]);
  const pixelRatio =
    typeof window === "undefined"
      ? 1
      : Math.min(window.devicePixelRatio || 1, PDF_MAX_PIXEL_RATIO);

  return (
    <div ref={ref} className="w-full">
      {width ? (
        <Document
          file={file}
          options={OPTIONS}
          suspense={false}
          externalLinkTarget="_blank"
          externalLinkRel="noopener noreferrer"
          loading={<ViewerStatus>{t.loading}</ViewerStatus>}
          error={null}
          onLoadSuccess={({ numPages }) => {
            setPages(numPages);
            onPages?.(numPages);
          }}
          onLoadError={onError}
          onSourceError={onError}
          className="flex flex-col gap-3"
        >
          {Array.from({ length: pages }, (_, index) => (
            // Page non passa aria-label al suo elemento: gruppo intorno
            <div
              key={index}
              role="group"
              aria-label={t.pageLabel(index + 1, pages)}
            >
              <Page
                pageNumber={index + 1}
                width={width}
                devicePixelRatio={pixelRatio}
                loading={
                  <div
                    className="aspect-[1/1.414] w-full bg-card"
                    aria-hidden="true"
                  />
                }
                className="scroll-mt-20 overflow-hidden rounded-xl border bg-white"
              />
            </div>
          ))}
        </Document>
      ) : null}
    </div>
  );
}

function ViewerStatus({ children }: { children: string }) {
  return (
    <p
      role="status"
      className="rounded-[20px] border bg-card px-4 py-10 text-center text-sm text-muted-foreground"
    >
      {children}
    </p>
  );
}
