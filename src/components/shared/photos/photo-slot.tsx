"use client";

import { cva } from "class-variance-authority";
import {
  ImagePlus,
  Lock,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useId, useRef, useState, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { PHOTO_INPUT_ACCEPT, type PhotoView } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";

import { PhotoSourceSheet } from "./photo-source-sheet";
import type { SlotUpload } from "./use-photo-upload";

const t = copy.photos;

const frameVariants = cva(
  "relative block aspect-[3/4] w-full overflow-hidden rounded-[14px]",
  {
    variants: {
      look: {
        photo: "bg-admin-hover ring-1 ring-foreground/10 ring-inset",
        empty: "border-2 border-dashed border-admin-field bg-background",
        drop: "border-2 border-dashed border-foreground bg-wash",
      },
    },
  },
);

/**
 * Foto 3:4 con angoli da 14 px, etichetta della vista in pillola bianca in
 * basso a sinistra e lucchetto se salvata. Vuota: bordo tratteggiato.
 */
export function PhotoFrame({
  view,
  url,
  alt,
  locked = false,
  dropping = false,
  showLabel = true,
  className,
  children,
}: {
  view: PhotoView;
  url: string | null;
  alt: string;
  locked?: boolean;
  dropping?: boolean;
  showLabel?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const empty = !url;
  return (
    <div
      className={cn(
        frameVariants({ look: dropping ? "drop" : empty ? "empty" : "photo" }),
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL firmato a scadenza breve, niente ottimizzazione di Next
        <img
          src={url}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        <span
          role="img"
          aria-label={
            dropping
              ? t.dropAlt(t.viewsLower[view])
              : t.emptySlotAlt(t.viewsLower[view])
          }
          className="absolute inset-0 flex items-center justify-center"
        >
          {dropping ? (
            <span className="absolute bottom-3.5 left-1/2 -translate-x-1/2 rounded-full bg-foreground px-2.5 py-0.5 text-[11.5px] font-bold whitespace-nowrap text-white">
              {t.upload.drop}
            </span>
          ) : null}
          <span className="flex size-11 items-center justify-center rounded-full border-[1.5px] border-admin-field bg-card text-foreground">
            <Plus aria-hidden="true" strokeWidth={1.8} className="size-5" />
          </span>
        </span>
      )}
      {showLabel && !dropping ? (
        <span className="absolute bottom-2 left-2 rounded-full bg-card/90 px-2 text-[11.5px] leading-4 font-bold text-foreground">
          {t.views[view]}
        </span>
      ) : null}
      {locked ? (
        <span
          role="img"
          aria-label={t.lockedLabel}
          className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-card/90 text-foreground"
        >
          <Lock aria-hidden="true" strokeWidth={1.8} className="size-3.5" />
        </span>
      ) : null}
      {children}
    </div>
  );
}

/** Avanzamento del caricamento sopra la foto, con "Annulla". */
function UploadOverlay({
  upload,
  onCancel,
}: {
  upload: SlotUpload;
  onCancel: () => void;
}) {
  if (upload.phase === "idle" || upload.phase === "error") return null;
  const label =
    upload.phase === "preparing"
      ? t.upload.preparing
      : upload.phase === "confirming"
        ? t.upload.confirming
        : t.upload.progress(upload.percent);
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/90 p-3 text-center">
      <span className="text-[13px] font-semibold text-foreground">{label}</span>
      {upload.phase === "uploading" ? (
        <>
          <span className="block h-2 w-full overflow-hidden rounded-full bg-admin-hover">
            <span
              className="block h-full rounded-full bg-foreground transition-[width]"
              style={{ width: `${upload.percent}%` }}
            />
          </span>
          <Button type="button" variant="neutral" size="sm" onClick={onCancel}>
            <X aria-hidden="true" strokeWidth={1.8} />
            {t.actions.cancel}
          </Button>
        </>
      ) : null}
    </div>
  );
}

const slotVariants = cva("flex", {
  variants: {
    layout: {
      // admin: colonna con foto, didascalia e comandi
      tile: "flex-col gap-2",
      // cliente: riga con miniatura e testo (C23)
      row: "items-start gap-3.5 rounded-[20px] border border-admin-line bg-card p-3",
    },
    empty: { true: "", false: "" },
  },
  compoundVariants: [
    {
      layout: "row",
      empty: true,
      className: "border-[1.5px] border-dashed border-admin-field",
    },
  ],
});

export type PhotoSlotProps = {
  view: PhotoView;
  url: string | null;
  alt: string;
  /** Didascalia sotto la foto ("Caricata da Giulia · 30 ott, 08:41"). */
  caption: string;
  layout: "tile" | "row";
  /** Set non salvato e chi guarda può scrivere: comandi visibili. */
  canEdit: boolean;
  /** Set salvato: lucchetto sulla foto. */
  locked: boolean;
  upload: SlotUpload;
  /** File: input con trascinamento (computer); source: fotocamera o libreria (telefono). */
  picker: "file" | "source";
  /** Pannello di caricamento (A21): l'area vuota invita a rilasciare il file. */
  dropHint?: boolean;
  onFile: (file: File) => void;
  onDelete: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onOpen?: () => void;
  deleting?: boolean;
};

/**
 * Una vista del set (FOTO-01, FOTO-04): foto o spazio vuoto, chi l'ha
 * caricata e, finché il set non è salvato, Aggiungi / Sostituisci /
 * Elimina. Dopo il salvataggio i comandi non ci sono (non disabilitati).
 */
export function PhotoSlot({
  view,
  url,
  alt,
  caption,
  layout,
  canEdit,
  locked,
  upload,
  picker,
  dropHint = false,
  onFile,
  onDelete,
  onCancel,
  onRetry,
  onOpen,
  deleting = false,
}: PhotoSlotProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const name = t.views[view];
  const busy = upload.phase !== "idle" && upload.phase !== "error";
  const hasPhoto = !!url;

  function pick() {
    if (picker === "source") setSourceOpen(true);
    else inputRef.current?.click();
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && canEdit && !busy) onFile(file);
  }

  const dropProps =
    canEdit && picker === "file"
      ? {
          onDragOver: (event: DragEvent) => {
            event.preventDefault();
            setDragging(true);
          },
          onDragLeave: () => setDragging(false),
          onDrop,
        }
      : {};

  const frame = (
    <PhotoFrame
      view={view}
      url={url}
      alt={alt}
      locked={locked}
      dropping={dragging || (dropHint && !hasPhoto && !busy)}
      showLabel={layout === "tile"}
    >
      <UploadOverlay upload={upload} onCancel={onCancel} />
    </PhotoFrame>
  );

  const openable = onOpen && hasPhoto && !busy;
  const frameElement = openable ? (
    <button
      type="button"
      onClick={onOpen}
      aria-label={t.actions.openPhoto(name)}
      className="block w-full rounded-[14px] outline-none focus-visible:ring-3 focus-visible:ring-foreground"
    >
      {frame}
    </button>
  ) : (
    frame
  );

  const errorBox =
    upload.phase === "error" ? (
      <div
        role="alert"
        className="flex flex-col gap-2 rounded-[14px] bg-warning p-3 text-[13px] leading-5 text-warning-foreground"
      >
        <span>{upload.message}</span>
        <Button
          type="button"
          variant="neutral"
          size="sm"
          onClick={onRetry}
          className="self-start"
        >
          <RefreshCw aria-hidden="true" strokeWidth={1.8} />
          {t.actions.retry}
        </Button>
      </div>
    ) : null;

  // tile strette (scheda admin sul telefono): solo icone, il nome resta nell'aria-label
  const narrowLabel = layout === "tile" ? "max-[560px]:sr-only" : undefined;
  const actions =
    canEdit && !busy ? (
      hasPhoto ? (
        <div className="flex gap-2">
          <Button
            type="button"
            variant="neutral"
            size="sm"
            className="min-w-11 flex-1"
            onClick={pick}
            aria-label={t.actions.replaceAria(name)}
          >
            <RefreshCw aria-hidden="true" strokeWidth={1.8} />
            <span className={narrowLabel}>{t.actions.replace}</span>
          </Button>
          <Button
            type="button"
            variant="neutral"
            size={layout === "tile" ? "icon" : "sm"}
            onClick={onDelete}
            disabled={deleting}
            aria-label={t.actions.deleteAria(name)}
          >
            <Trash2 aria-hidden="true" strokeWidth={1.8} />
            {layout === "row" ? t.actions.delete : null}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="neutral"
          size="sm"
          className={layout === "tile" ? "w-full" : "self-start"}
          onClick={pick}
          aria-label={
            picker === "file" && dropHint
              ? t.actions.chooseFileAria(name)
              : t.actions.addAria(name)
          }
        >
          {picker === "file" && dropHint ? (
            <Upload aria-hidden="true" strokeWidth={1.8} />
          ) : (
            <ImagePlus aria-hidden="true" strokeWidth={1.8} />
          )}
          <span className={narrowLabel}>
            {picker === "file" && dropHint
              ? t.actions.chooseFile
              : t.actions.add}
          </span>
        </Button>
      )
    ) : null;

  const input = canEdit ? (
    <>
      {picker === "file" ? (
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={PHOTO_INPUT_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onFile(file);
          }}
        />
      ) : (
        <PhotoSourceSheet
          open={sourceOpen}
          onOpenChange={setSourceOpen}
          title={
            hasPhoto ? t.source.titleReplace(name) : t.source.titleAdd(name)
          }
          onFile={(file) => {
            setSourceOpen(false);
            onFile(file);
          }}
        />
      )}
    </>
  ) : null;

  if (layout === "row") {
    return (
      <div className={slotVariants({ layout, empty: !hasPhoto })}>
        <div className="w-[92px] shrink-0" {...dropProps}>
          {frameElement}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span className="text-[15px] font-bold">{name}</span>
          <span className="text-[13px] leading-5 text-admin-muted">
            {caption}
          </span>
          {errorBox}
          {actions}
        </div>
        {input}
      </div>
    );
  }

  return (
    <div className={slotVariants({ layout, empty: !hasPhoto })}>
      <div {...dropProps}>{frameElement}</div>
      <span className="text-[13px] leading-5 text-admin-muted">{caption}</span>
      {errorBox}
      {actions}
      {input}
    </div>
  );
}
