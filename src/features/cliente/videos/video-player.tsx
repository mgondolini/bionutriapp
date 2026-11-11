"use client";

import { Play, RotateCw, VideoOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { VideoThumbnail } from "@/components/shared/video-thumbnail";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy/it";
import { youtubeEmbedUrl } from "@/lib/videos/youtube";
import { recordVideoViewAction } from "@/server/actions/videos.actions";

const t = copy.client.videos;

/**
 * Player del video (C16): finché non si tocca "Riproduci" c'è solo la
 * miniatura, così YouTube non riceve nulla all'apertura della pagina
 * (privacy e velocità); poi l'iframe di youtube-nocookie parte da solo.
 * Il primo avvio viene registrato ("Aperto da" dello staff, "Nuovo" che sparisce).
 */
export function VideoPlayer({
  videoId,
  youtubeId,
  title,
}: {
  videoId: string;
  youtubeId: string;
  title: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [, startTransition] = useTransition();

  const play = () => {
    setPlaying(true);
    startTransition(async () => {
      // l'esito non cambia nulla per chi guarda: si riprova al prossimo avvio
      await recordVideoViewAction({ videoId });
    });
  };

  if (playing) {
    return (
      <div className="relative aspect-video overflow-hidden rounded-2xl bg-foreground">
        <iframe
          src={youtubeEmbedUrl(youtubeId)}
          title={t.playerTitle(title)}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={play}
      aria-label={t.play(title)}
      className="group relative block w-full overflow-hidden rounded-2xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      <VideoThumbnail youtubeId={youtubeId} className="w-full rounded-2xl">
        <span className="absolute top-1/2 left-1/2 z-10 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-foreground pl-1 text-video transition-transform group-hover:scale-105">
          <Play aria-hidden="true" className="size-7 fill-current" />
        </span>
        <span className="absolute bottom-3 left-3 z-10 rounded-full bg-white/90 px-2 py-0.5 text-[11.5px] font-semibold text-foreground">
          {t.playerSource}
        </span>
      </VideoThumbnail>
    </button>
  );
}

/** Video segnalato come non disponibile (C17): riprova e uscita verso YouTube. */
export function UnavailablePlayer() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <div
      role="alert"
      className="flex aspect-video flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line-strong bg-muted p-4 text-center text-secondary-foreground"
    >
      <span className="flex size-10 items-center justify-center rounded-xl bg-white">
        <VideoOff aria-hidden="true" className="size-5" />
      </span>
      <p className="text-[15px] font-bold text-foreground">
        {t.unavailable.title}
      </p>
      <p className="max-w-[250px] text-[12.5px]">{t.unavailable.text}</p>
      <Button
        type="button"
        size="sm"
        className="mt-1"
        disabled={isPending}
        onClick={() => startTransition(() => router.refresh())}
      >
        <RotateCw aria-hidden="true" />
        {t.unavailable.retry}
      </Button>
    </div>
  );
}
