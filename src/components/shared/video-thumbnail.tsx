import { Clapperboard } from "lucide-react";

import { cn } from "@/lib/utils";
import { youtubeThumbnailUrl } from "@/lib/videos/youtube";

/**
 * Miniatura 16:9 di un video YouTube (mockup v4), decorativa: il titolo è
 * sempre scritto accanto. Sotto l'immagine un fondo Lavanda con l'icona, che
 * resta visibile se la miniatura non si carica (video rimosso, rete assente).
 */
export function VideoThumbnail({
  youtubeId,
  className,
  children,
}: {
  youtubeId: string;
  className?: string;
  /** Sovrapposizioni (pulsante play, badge). */
  children?: React.ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative flex aspect-video shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-video text-video-ink shadow-[inset_0_0_0_1px_rgb(31_58_52/0.08)]",
        className,
      )}
    >
      <Clapperboard className="size-5" />
      {/* eslint-disable-next-line @next/next/no-img-element -- miniatura esterna di YouTube, già ottimizzata */}
      <img
        src={youtubeThumbnailUrl(youtubeId)}
        alt=""
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        className="absolute inset-0 size-full object-cover"
      />
      {children}
    </span>
  );
}
