"use client";

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
import type { ActionResult } from "@/types/action-result";

/** Conferma di un'eliminazione (cartella vuota o video). */
export function ConfirmDeleteDialog({
  trigger,
  title,
  description,
  cancel,
  confirm,
  done,
  blocked,
  onConfirm,
  onDone,
}: {
  trigger: React.ReactElement;
  title: string;
  description: string;
  cancel: string;
  confirm: string;
  /** Messaggio dopo l'eliminazione. */
  done: string;
  /** Motivo per cui non si può eliminare: il pulsante resta disattivato. */
  blocked?: string | null;
  onConfirm: () => Promise<ActionResult>;
  onDone?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) setError(null);
  };

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const result = await onConfirm();
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      changeOpen(false);
      toast.success(done);
      onDone?.();
    });
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{blocked ?? description}</DialogDescription>
        </DialogHeader>
        {error ? <FormMessage>{error}</FormMessage> : null}
        <DialogFooter>
          <Button
            type="button"
            variant="neutral"
            onClick={() => changeOpen(false)}
          >
            {cancel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={submit}
            disabled={isPending || Boolean(blocked)}
          >
            {confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
