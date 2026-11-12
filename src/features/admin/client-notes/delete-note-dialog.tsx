"use client";

import { useState, useTransition } from "react";

import { FormMessage } from "@/components/shared/form-message";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { copy } from "@/lib/copy/it";
import { deleteNoteAction } from "@/server/actions/client-notes.actions";

const t = copy.clientNotes;

/**
 * Conferma esplicita prima di eliminare una nota di visita (l'anamnesi non
 * ha questa azione): dal basso sul telefono, dialog su schermi larghi.
 */
export function DeleteNoteDialog({
  open,
  onOpenChange,
  noteId,
  title,
  dateLabel,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  title: string;
  /** "10 nov 2026" */
  dateLabel: string;
  onDeleted: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteNoteAction({ noteId });
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onOpenChange(false);
      onDeleted();
    });
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError(null);
      }}
      title={t.deleteTitle}
      description={t.deleteDescription(title, dateLabel)}
    >
      <div className="flex flex-col gap-4 pt-2">
        {error ? <FormMessage>{error}</FormMessage> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="neutral"
            className="rounded-[14px]"
            onClick={() => onOpenChange(false)}
          >
            {t.cancel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-[14px]"
            onClick={confirm}
            disabled={isPending}
          >
            {t.deleteConfirm}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
