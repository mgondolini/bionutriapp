"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { PHONE_MEDIA_QUERY, useMediaQuery } from "@/lib/use-media-query";

type ResponsiveDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Pulsante che apre il pannello (con il suo contenuto). */
  trigger: React.ReactElement;
  title: string;
  description?: React.ReactNode;
  /** Classi in più per il dialog su schermi larghi (es. larghezza per un testo lungo). */
  dialogClassName?: string;
  children: React.ReactNode;
};

/**
 * Form in un pannello (A-17, NF-08): dal basso su telefono, dove resta a
 * portata di pollice e scorre se è lungo, e in un dialog su schermi più
 * larghi. Stessi titolo, descrizione e contenuto.
 */
export function ResponsiveDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  dialogClassName,
  children,
}: ResponsiveDialogProps) {
  const phone = useMediaQuery(PHONE_MEDIA_QUERY);
  if (phone) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger render={trigger} />
        <SheetContent
          side="bottom"
          className="max-h-[90dvh] gap-0 overflow-y-auto rounded-t-2xl"
        >
          <SheetHeader className="pr-12">
            <SheetTitle>{title}</SheetTitle>
            {description ? (
              <SheetDescription>{description}</SheetDescription>
            ) : null}
          </SheetHeader>
          <div className="px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={trigger} />
      <DialogContent className={dialogClassName}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
