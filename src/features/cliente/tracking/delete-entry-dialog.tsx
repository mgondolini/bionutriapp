"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { copy } from "@/lib/copy/it";
import { deleteEntryAction } from "@/server/actions/tracking.actions";

const t = copy.client.tracking.edit;

/** Eliminazione di una registrazione con conferma (T-03). */
export function DeleteEntryDialog({
  entryId,
  dateLabel,
  valueLabel,
}: {
  entryId: string;
  /** "8 settembre 2026" */
  dateLabel: string;
  /** "77,0 cm", "4/5" */
  valueLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteEntryAction({ entryId });
      if (redirectIfSignedOut(result)) return;
      if (result.ok) {
        toast.success(t.deleted);
        setOpen(false);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={t.deleteAria(dateLabel)}
          />
        }
      >
        <Trash2 aria-hidden="true" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.deleteTitle}</DialogTitle>
          <DialogDescription>{t.deleteDescription}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-0.5 rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="font-medium">{valueLabel}</span>
          <span className="text-muted-foreground">{dateLabel}</span>
        </div>
        {error ? <FormMessage>{error}</FormMessage> : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            {t.cancel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirm}
            disabled={isPending}
          >
            {t.deleteConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
