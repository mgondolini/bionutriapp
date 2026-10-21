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
import { deleteFileAction } from "@/server/actions/files.actions";

const t = copy.admin.clients.files.delete;

type DeleteFileDialogProps = {
  fileId: string;
  title: string;
  /** "Dieta · caricato il 14 settembre 2026 · non ancora letto" */
  meta: string;
  clientName: string;
};

/** Conferma prima dell'eliminazione (A-11, schermata A8). */
export function DeleteFileDialog({
  fileId,
  title,
  meta,
  clientName,
}: DeleteFileDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteFileAction({ fileId });
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
            aria-label={copy.admin.clients.files.list.deleteAria(title)}
          />
        }
      >
        <Trash2 aria-hidden="true" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.title}</DialogTitle>
          <DialogDescription>{t.description(clientName)}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-0.5 rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="font-medium">{title}</span>
          <span className="text-muted-foreground">{meta}</span>
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
            {t.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
