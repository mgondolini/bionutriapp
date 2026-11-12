"use client";

import { Camera, ChevronRight, Images } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PHOTO_INPUT_ACCEPT } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

const t = copy.photos.source;

/**
 * Scelta della fonte (C24): scattare adesso (fotocamera posteriore) o una
 * foto della libreria. Il titolo dice quale vista si sta aggiungendo.
 */
export function PhotoSourceSheet({
  open,
  onOpenChange,
  title,
  onFile,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onFile: (file: File) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);

  function input(
    ref: React.RefObject<HTMLInputElement | null>,
    capture: boolean,
  ) {
    return (
      <input
        ref={ref}
        type="file"
        accept={PHOTO_INPUT_ACCEPT}
        capture={capture ? "environment" : undefined}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    );
  }

  const options = [
    { ref: cameraRef, Icon: Camera, label: t.camera, hint: t.cameraHint },
    { ref: libraryRef, Icon: Images, label: t.library, hint: t.libraryHint },
  ];

  return (
    <>
      {/* gli input restano montati: il file arriva anche a pannello chiuso */}
      {input(cameraRef, true)}
      {input(libraryRef, false)}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="gap-0 rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="pr-12">
            <SheetTitle>{title}</SheetTitle>
            <SheetDescription>{t.description}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2.5 px-4">
            {options.map(({ ref, Icon, label, hint }) => (
              <button
                key={label}
                type="button"
                onClick={() => ref.current?.click()}
                className="flex min-h-16 items-center gap-3.5 rounded-[20px] border border-admin-line bg-card px-4 py-3 text-left outline-none hover:bg-wash focus-visible:ring-3 focus-visible:ring-foreground"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-admin-hover text-foreground">
                  <Icon
                    aria-hidden="true"
                    strokeWidth={1.8}
                    className="size-5"
                  />
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="text-[15px] font-bold">{label}</span>
                  <span className="text-[13px] text-admin-muted">{hint}</span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  strokeWidth={1.8}
                  className="size-4 text-admin-muted"
                />
              </button>
            ))}
            <Button
              type="button"
              variant="ghost"
              className="mt-1"
              onClick={() => onOpenChange(false)}
            >
              {copy.photos.actions.cancel}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
