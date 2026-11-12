"use client";

import { ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PhotoView } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";
import type { PhotoItem } from "@/server/services/photos.service";

import { PhotoFrame } from "./photo-slot";

const t = copy.photos;

export type ViewerDetail = { label: string; value: string };

/**
 * Foto salvate a schermo intero (A23, FOTO-05): una vista alla volta, con
 * le altre due accanto e i dati del check. Frecce sinistra e destra per
 * cambiare vista, Esc per chiudere (focus restituito a chi l'ha aperto).
 * Nessun comando per sostituire o eliminare.
 */
export function PhotoViewer({
  open,
  onOpenChange,
  photos,
  initialView,
  checkLabel,
  subtitle,
  altOf,
  details,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: PhotoItem[];
  initialView: PhotoView;
  checkLabel: string;
  subtitle: string;
  altOf: (photo: PhotoItem) => string;
  /** Righe dei dati per la foto mostrata (check, data, vista, chi…). */
  details: (photo: PhotoItem) => ViewerDetail[];
}) {
  const startIndex = () =>
    Math.max(
      0,
      photos.findIndex((p) => p.view === initialView),
    );
  const [index, setIndex] = useState(startIndex);
  // a ogni apertura si riparte dalla vista scelta (aggiornamento durante il render)
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setIndex(startIndex());
  }

  const photo = photos[index];
  if (!photo) return null;
  const go = (step: number) =>
    setIndex((current) => (current + step + photos.length) % photos.length);

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onKeyDown={onKeyDown}
        className="w-[calc(100%-1rem)] gap-5 p-4 sm:max-w-[960px] sm:p-6"
      >
        <div className="pr-10">
          <DialogTitle>
            {t.viewer.title(checkLabel, t.views[photo.view])}
          </DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </div>
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="flex flex-col gap-3">
            <div className="relative mx-auto w-full max-w-[min(100%,calc(70dvh*0.75))]">
              <PhotoFrame
                view={photo.view}
                url={photo.url}
                alt={altOf(photo)}
                locked
              />
              {photos.length > 1 ? (
                <>
                  <Button
                    type="button"
                    variant="neutral"
                    size="icon"
                    onClick={() => go(-1)}
                    aria-label={t.viewer.previous}
                    className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full"
                  >
                    <ChevronLeft aria-hidden="true" strokeWidth={1.8} />
                  </Button>
                  <Button
                    type="button"
                    variant="neutral"
                    size="icon"
                    onClick={() => go(1)}
                    aria-label={t.viewer.next}
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full"
                  >
                    <ChevronRight aria-hidden="true" strokeWidth={1.8} />
                  </Button>
                </>
              ) : null}
            </div>
            <div
              role="group"
              aria-label={t.viewer.viewsLabel}
              className="grid grid-cols-3 gap-2"
            >
              {photos.map((item, i) => (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-pressed={i === index}
                  className={cn(
                    "min-h-11 rounded-[14px] border-[1.5px] px-3 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-foreground",
                    i === index
                      ? "border-foreground bg-wash"
                      : "border-admin-field bg-card hover:bg-wash",
                  )}
                >
                  {t.views[item.view]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2.5 text-sm">
              {details(photo).map((row) => (
                <div key={row.label} className="contents">
                  <dt className="text-[13px] text-admin-muted">{row.label}</dt>
                  <dd className="font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
            <div className="flex items-start gap-3 rounded-[14px] bg-info p-3.5 text-sm leading-5 text-info-foreground">
              <Lock
                aria-hidden="true"
                strokeWidth={1.8}
                className="mt-0.5 size-4 shrink-0"
              />
              <p>{t.viewer.lockNote}</p>
            </div>
            <DialogClose render={<Button type="button" variant="neutral" />}>
              {t.viewer.close}
            </DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
