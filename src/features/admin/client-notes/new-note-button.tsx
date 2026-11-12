"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { clientNotesPath } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";
import { createVisitNoteAction } from "@/server/actions/client-notes.actions";

/**
 * "Nuova nota": crea "Visita di controllo" con la data di oggi e la apre.
 * Con modifiche non salvate chiede prima conferma (`data-leave-guard`).
 */
export function NewNoteButton({
  clientId,
  className,
}: {
  clientId: string;
  className?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const create = () =>
    startTransition(async () => {
      const result = await createVisitNoteAction({ clientId });
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push(clientNotesPath(clientId, result.data.id));
    });
  return (
    <Button
      type="button"
      variant="action"
      data-leave-guard=""
      onClick={create}
      disabled={isPending}
      className={cn("rounded-[14px]", className)}
    >
      <Plus aria-hidden="true" strokeWidth={1.8} />
      {copy.clientNotes.newNote}
    </Button>
  );
}
