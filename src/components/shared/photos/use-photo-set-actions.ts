"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import type { PhotoView } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import {
  deletePhotoAction,
  savePhotoSetAction,
} from "@/server/actions/photos.actions";

/**
 * Eliminazione di una foto in bozza e "Salva le foto" → "Foto salvate".
 * Gli errori arrivano come toast (testo della Server Action).
 */
export function usePhotoSetActions(sessionId: string) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<PhotoView | null>(null);
  const [saving, startSaving] = useTransition();

  async function remove(view: PhotoView) {
    setDeleting(view);
    const result = await deletePhotoAction({ sessionId, view });
    setDeleting(null);
    if (redirectIfSignedOut(result)) return;
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(copy.photos.deletedToast(copy.photos.views[view]));
    router.refresh();
  }

  function save(onDone: () => void) {
    startSaving(async () => {
      const result = await savePhotoSetAction({ sessionId });
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(copy.photos.savedToast);
      onDone();
      router.refresh();
    });
  }

  return { remove, deleting, save, saving };
}
