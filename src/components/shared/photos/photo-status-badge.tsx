import { cva } from "class-variance-authority";
import { Camera, Lock } from "lucide-react";

import { copy } from "@/lib/copy/it";
import type { PhotoSetState } from "@/lib/photos/status";
import { cn } from "@/lib/utils";

const t = copy.photos.state;

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] leading-[18px] font-semibold whitespace-nowrap text-foreground",
  {
    variants: {
      status: {
        // pesca = richiede attenzione; con la fotocamera, non solo il colore
        to_upload: "bg-warm",
        draft: "bg-warm",
        ready: "bg-warm",
        saved: "bg-wash",
        future: "border-[1.5px] border-admin-field bg-card px-2",
      },
    },
  },
);

type BadgeStatus = Exclude<PhotoSetState, "skipped">;

/**
 * Stato di un set (DEV-13): il lucchetto con "Salvate" è lo stesso
 * ovunque; bozza e set da caricare hanno la fotocamera.
 */
export function PhotoStatusBadge({
  status,
  count = 0,
  className,
}: {
  status: BadgeStatus;
  /** Foto caricate, per "Bozza · 2 di 3". */
  count?: number;
  className?: string;
}) {
  const label =
    status === "draft"
      ? t.draft(count)
      : status === "ready"
        ? t.ready
        : status === "saved"
          ? t.saved
          : status === "future"
            ? t.future
            : t.to_upload;
  const Icon = status === "saved" ? Lock : status === "future" ? null : Camera;
  return (
    <span className={cn(badgeVariants({ status }), className)}>
      {Icon ? (
        <Icon aria-hidden="true" strokeWidth={1.8} className="size-3.5" />
      ) : null}
      {label}
    </span>
  );
}

/** Barra a tre segmenti delle foto caricate (decorativa: il testo accanto dice quante). */
export function PhotoProgress({
  count,
  onMint = false,
  className,
}: {
  count: number;
  onMint?: boolean;
  className?: string;
}) {
  return (
    <div aria-hidden="true" className={cn("flex gap-1", className)}>
      {[0, 1, 2].map((index) => (
        <i
          key={index}
          className={cn(
            "block flex-1 rounded-full",
            onMint ? "h-2.5" : "h-2",
            index < count
              ? "bg-foreground"
              : onMint
                ? "bg-card"
                : "bg-admin-hover",
          )}
        />
      ))}
    </div>
  );
}
