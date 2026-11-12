"use client";

import { Lock, TriangleAlert } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { PHOTO_VIEWS } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { PHONE_MEDIA_QUERY, useMediaQuery } from "@/lib/use-media-query";
import type { PhotoItem } from "@/server/services/photos.service";

import { PhotoFrame } from "./photo-slot";

const t = copy.photos.confirm;

/**
 * Conferma del salvataggio (A22, C25, FOTO-05): anteprime, avviso che dopo
 * non si cambia più nulla e "Salva definitivamente". È un alertdialog con
 * il focus su "Torna alle foto", il percorso sicuro. Sul telefono è un
 * foglio dal basso con i pulsanti a portata di pollice.
 */
export function SavePhotosDialog({
  open,
  onOpenChange,
  checkLabel,
  description,
  checkText,
  photos,
  altOf,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkLabel: string;
  description: string;
  checkText: string;
  photos: PhotoItem[];
  altOf: (photo: PhotoItem) => string;
  pending: boolean;
  onConfirm: () => void;
}) {
  const phone = useMediaQuery(PHONE_MEDIA_QUERY);
  const backRef = useRef<HTMLButtonElement>(null);
  const titleText = t.title(checkLabel);

  const previews = (
    <div className="grid grid-cols-3 gap-3">
      {PHOTO_VIEWS.map((view) => {
        const photo = photos.find((p) => p.view === view);
        return (
          <PhotoFrame
            key={view}
            view={view}
            url={photo?.url ?? null}
            alt={photo ? altOf(photo) : ""}
          />
        );
      })}
    </div>
  );

  const warning = (
    <div className="flex items-start gap-3 rounded-[14px] bg-warning p-3.5 text-sm leading-5 text-warning-foreground">
      <TriangleAlert
        aria-hidden="true"
        strokeWidth={1.8}
        className="mt-0.5 size-4 shrink-0"
      />
      <p>{checkText}</p>
    </div>
  );

  const back = (
    <Button
      ref={backRef}
      type="button"
      variant="neutral"
      onClick={() => onOpenChange(false)}
      disabled={pending}
    >
      {t.back}
    </Button>
  );
  const save = (
    <Button
      type="button"
      variant="action"
      onClick={onConfirm}
      disabled={pending}
    >
      <Lock aria-hidden="true" strokeWidth={1.8} />
      {pending ? t.saving : t.confirm}
    </Button>
  );

  if (phone) {
    return (
      <Sheet
        open={open}
        onOpenChange={(next) => !pending && onOpenChange(next)}
      >
        <SheetContent
          side="bottom"
          role="alertdialog"
          initialFocus={backRef}
          showCloseButton={false}
          className="max-h-[90dvh] gap-4 overflow-y-auto rounded-t-2xl px-4 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetTitle className="text-[19px] font-bold">{titleText}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
          {previews}
          {warning}
          <div className="flex flex-col gap-2.5 [&>button]:w-full">
            {save}
            {back}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent
        role="alertdialog"
        initialFocus={backRef}
        showCloseButton={false}
        className="sm:max-w-[520px]"
      >
        <DialogTitle>{titleText}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
        {previews}
        {warning}
        <div className="flex justify-end gap-2.5">
          {back}
          {save}
        </div>
      </DialogContent>
    </Dialog>
  );
}
