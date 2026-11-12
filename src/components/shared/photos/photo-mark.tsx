import { Camera, Lock } from "lucide-react";

import { copy } from "@/lib/copy/it";
import type { PhotoSetState } from "@/lib/photos/status";
import { cn } from "@/lib/utils";

/**
 * Segno "Foto" nel percorso (A17, C19): lucchetto se il set è salvato, pesca se è da
 * completare, tratteggiato se deve ancora aprirsi.
 */
export function PhotoMark({ state }: { state: PhotoSetState }) {
  const saved = state === "saved";
  const future = state === "future";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-foreground",
        saved
          ? "bg-wash"
          : future
            ? "border-[1.5px] border-dashed border-admin-field bg-card px-1.5"
            : "bg-warm",
      )}
    >
      {saved ? (
        <Lock aria-hidden="true" strokeWidth={1.8} className="size-3" />
      ) : (
        <Camera aria-hidden="true" strokeWidth={1.8} className="size-3" />
      )}
      {copy.photos.admin.journeySign}
      <span className="sr-only">
        {copy.photos.admin.journeySignState(
          saved
            ? copy.photos.state.saved
            : future
              ? copy.photos.state.future
              : copy.photos.state.to_upload,
        )}
      </span>
    </span>
  );
}
