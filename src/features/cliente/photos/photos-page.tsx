import { CalendarClock, Camera, ChevronRight, Lock } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { PhotoFrame } from "@/components/shared/photos/photo-slot";
import {
  PhotoProgress,
  PhotoStatusBadge,
} from "@/components/shared/photos/photo-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { photoSetClientPath } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatLongDate } from "@/lib/format";
import { isOpenState } from "@/lib/photos/status";
import { cn } from "@/lib/utils";
import type {
  ClientPhotos,
  PhotoSetView,
} from "@/server/services/photos.service";

const t = copy.photos;
const c = copy.photos.client;

function alt(set: PhotoSetView, view: PhotoSetView["photos"][number]["view"]) {
  return t.alt(t.viewsLower[view], set.label, formatLongDate(set.date));
}

/** Set da caricare in evidenza (Menta), con la barra e un solo pulsante. */
function OpenHero({
  set,
  previous,
  canWrite,
}: {
  set: PhotoSetView;
  previous: PhotoSetView | undefined;
  canWrite: boolean;
}) {
  const count = set.photos.length;
  const action = count === 0 ? c.start : count === 3 ? c.review : c.continue;
  return (
    <section
      aria-labelledby={`hero-${set.sessionId}`}
      className="flex flex-col gap-3 rounded-[20px] bg-mint p-5 text-foreground"
    >
      <div className="flex items-center justify-between gap-2 text-[12.5px] font-bold">
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-2.5 py-0.5 text-mint">
            <Camera aria-hidden="true" strokeWidth={1.8} className="size-3.5" />
            {c.heroTag}
          </span>
          {set.label}
        </span>
        <span>{formatLongDate(set.date)}</span>
      </div>
      <h2
        id={`hero-${set.sessionId}`}
        className="text-[21px] leading-tight font-bold tracking-tight"
      >
        {c.heroTitle(set.label)}
      </h2>
      <p className="rounded-xl bg-white/60 px-3.5 py-3 text-sm leading-5">
        {previous ? c.heroNoteAfter(previous.label) : c.heroNote}
      </p>
      <PhotoProgress count={count} onMint />
      <p className="text-[13px] font-semibold">{c.heroProgress(count)}</p>
      {canWrite || count > 0 ? (
        <Link
          href={photoSetClientPath(set.sessionId)}
          className={cn(
            buttonVariants({ variant: "action", size: "lg" }),
            "w-full",
          )}
        >
          <Camera aria-hidden="true" strokeWidth={1.8} />
          {canWrite ? action : c.review}
        </Link>
      ) : null}
    </section>
  );
}

/** Pagina "Le tue foto" (C22): da caricare, salvate, prossime. */
export function PhotosPage({ data }: { data: ClientPhotos }) {
  const open = data.sets.filter((set) => isOpenState(set.state));
  const saved = data.sets.filter((set) => set.state === "saved");
  const future = data.sets.filter((set) => set.state === "future");

  if (data.sets.length === 0) {
    return (
      <EmptyState
        icon={Camera}
        title={c.emptyTitle}
        description={c.emptyDescription}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {!data.canWrite && open.length > 0 ? (
        <p className="rounded-[14px] bg-info p-3.5 text-sm leading-5 text-info-foreground">
          {c.readOnly}
        </p>
      ) : null}
      {open.map((set) => (
        <OpenHero
          key={set.sessionId}
          set={set}
          previous={saved.find((s) => s.date < set.date)}
          canWrite={data.canWrite}
        />
      ))}

      {saved.length > 0 ? (
        <section aria-labelledby="saved-title" className="flex flex-col gap-3">
          <h2
            id="saved-title"
            className="flex items-baseline gap-2 text-[17px] font-bold"
          >
            {c.savedSection}
            <span className="text-[13px] font-semibold text-admin-muted">
              {c.setCount(saved.length)}
            </span>
          </h2>
          {saved.map((set) => (
            <Link
              key={set.sessionId}
              href={photoSetClientPath(set.sessionId)}
              className="flex flex-col gap-3 rounded-[20px] border border-admin-line bg-card p-4 outline-none hover:bg-admin-row-hover focus-visible:ring-3 focus-visible:ring-foreground"
            >
              <span className="flex items-start justify-between gap-3">
                <span className="flex flex-col">
                  <b className="text-[15px]">{set.label}</b>
                  <span className="text-[13px] text-admin-muted">
                    {set.savedByRole === "studio"
                      ? c.savedByStudio(formatLongDate(set.date))
                      : c.savedByYou(formatLongDate(set.date))}
                  </span>
                </span>
                <PhotoStatusBadge status="saved" />
              </span>
              <span className="grid grid-cols-3 gap-2">
                {set.photos.map((photo) => (
                  <PhotoFrame
                    key={photo.view}
                    view={photo.view}
                    url={photo.url}
                    alt={alt(set, photo.view)}
                  />
                ))}
              </span>
            </Link>
          ))}
        </section>
      ) : null}

      {future.length > 0 ? (
        <section aria-labelledby="next-title" className="flex flex-col gap-3">
          <h2 id="next-title" className="text-[17px] font-bold">
            {c.nextSection}
          </h2>
          <ul className="flex flex-col gap-2">
            {future.map((set) => (
              <li
                key={set.sessionId}
                className="flex items-center gap-3 rounded-[20px] border-[1.5px] border-dashed border-admin-field bg-background px-4 py-3"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-admin-hover">
                  <CalendarClock
                    aria-hidden="true"
                    strokeWidth={1.8}
                    className="size-5"
                  />
                </span>
                <span className="flex flex-col">
                  <b className="text-[15px]">{set.label}</b>
                  <span className="text-[13px] text-admin-muted">
                    {c.nextLine(formatLongDate(set.date))}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="flex items-start gap-2 text-[13px] leading-5 text-admin-muted">
        <Lock
          aria-hidden="true"
          strokeWidth={1.8}
          className="mt-0.5 size-4 shrink-0"
        />
        <span>{c.privacy}</span>
      </p>
    </div>
  );
}

/** Card della home (C5) per un set da caricare; sparisce dopo il salvataggio. */
export function PhotoHomeCard({ set }: { set: PhotoSetView }) {
  const count = set.photos.length;
  const missing = set.missing.map((view) => t.views[view]).join(" e ");
  return (
    <Link
      href={photoSetClientPath(set.sessionId)}
      className="flex items-center gap-3.5 rounded-[20px] border-2 border-warm bg-card p-4 outline-none hover:bg-admin-row-hover focus-visible:ring-3 focus-visible:ring-foreground"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-warm">
        <Camera aria-hidden="true" strokeWidth={1.8} className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <b className="text-[15px]">{c.homeTitle(set.label)}</b>
        <span className="text-[13px] text-admin-muted">
          {c.homeProgress(count, missing)}
        </span>
      </span>
      <span className="inline-flex items-center gap-1 text-sm font-semibold">
        {count === 0 ? c.homeStart : c.homeContinue}
        <ChevronRight aria-hidden="true" strokeWidth={1.8} className="size-4" />
      </span>
    </Link>
  );
}
