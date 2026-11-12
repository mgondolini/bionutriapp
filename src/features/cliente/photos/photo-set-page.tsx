"use client";

import { Info, Lock } from "lucide-react";
import { useState } from "react";

import { relativeWhen, savedParts } from "@/components/shared/photos/labels";
import { PhotoFrame, PhotoSlot } from "@/components/shared/photos/photo-slot";
import {
  PhotoProgress,
  PhotoStatusBadge,
} from "@/components/shared/photos/photo-status-badge";
import { SavePhotosDialog } from "@/components/shared/photos/save-photos-dialog";
import { usePhotoSetActions } from "@/components/shared/photos/use-photo-set-actions";
import { usePhotoUpload } from "@/components/shared/photos/use-photo-upload";
import { Button } from "@/components/ui/button";
import { PHOTO_VIEWS, type PhotoView } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatLongDate } from "@/lib/format";
import { canSavePhotoSet } from "@/lib/photos/status";
import { cn } from "@/lib/utils";
import type { PhotoItem, PhotoSetView } from "@/server/services/photos.service";

const t = copy.photos;
const c = copy.photos.client;

function altOf(set: PhotoSetView) {
  return (photo: PhotoItem) =>
    t.alt(t.viewsLower[photo.view], set.label, formatLongDate(set.date));
}

/** Set salvato (C26): una vista alla volta a tutta larghezza, senza comandi. */
function SavedSet({ set }: { set: PhotoSetView }) {
  const [view, setView] = useState<PhotoView>("front");
  const photo = set.photos.find((p) => p.view === view) ?? set.photos[0];
  const saved = set.savedAt ? savedParts(set.savedAt) : null;
  if (!photo) return null;
  return (
    <div className="flex flex-col gap-3.5">
      {saved ? (
        <div className="flex items-start gap-3 rounded-[14px] bg-wash p-3.5 text-sm leading-5">
          <Lock
            aria-hidden="true"
            strokeWidth={1.8}
            className="mt-0.5 size-4 shrink-0"
          />
          <p>
            <b>{c.savedBanner(saved.date)}</b> {c.savedBannerRest}
          </p>
        </div>
      ) : null}
      <div
        role="group"
        aria-label={t.viewer.viewsLabel}
        className="grid grid-cols-3 gap-1 rounded-[14px] bg-admin-hover p-1"
      >
        {set.photos.map((item) => (
          <button
            key={item.view}
            type="button"
            aria-pressed={item.view === photo.view}
            onClick={() => setView(item.view)}
            className={cn(
              "min-h-11 rounded-[10px] text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-foreground",
              item.view === photo.view
                ? "bg-card text-foreground"
                : "text-admin-muted",
            )}
          >
            {t.views[item.view]}
          </button>
        ))}
      </div>
      <PhotoFrame
        view={photo.view}
        url={photo.url}
        alt={altOf(set)(photo)}
        locked
        showLabel={false}
      />
      <dl className="grid grid-cols-[120px_1fr] gap-x-3 gap-y-2.5 rounded-[20px] border border-admin-line bg-card p-4 text-sm">
        <dt className="text-admin-muted">{t.viewer.check}</dt>
        <dd className="font-medium">{set.label}</dd>
        <dt className="text-admin-muted">{t.viewer.date}</dt>
        <dd className="font-medium">{formatLongDate(set.date)}</dd>
        <dt className="text-admin-muted">{t.viewer.view}</dt>
        <dd className="font-medium">{t.views[photo.view]}</dd>
        {saved ? (
          <>
            <dt className="text-admin-muted">{t.viewer.savedBy}</dt>
            <dd className="font-medium">
              {set.savedByRole === "studio"
                ? c.savedByLineStudio(saved.dayMonth, saved.time)
                : c.savedByLineYou(saved.dayMonth, saved.time)}
            </dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}

/** Set aperto (C23–C25): una riga per vista, poi "Salva le foto". */
function OpenSet({ set }: { set: PhotoSetView }) {
  const upload = usePhotoUpload(set.sessionId);
  const actions = usePhotoSetActions(set.sessionId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const count = set.photos.length;
  const canSave =
    set.canEdit &&
    canSavePhotoSet({
      setStatus: "draft",
      views: set.photos.map((p) => p.view),
    }) &&
    !upload.busy;
  const alt = altOf(set);

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-2.5 rounded-[20px] border border-admin-line bg-card px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <b className="text-[15px]">{t.countUploaded(count)}</b>
          {count === 3 ? (
            <PhotoStatusBadge status="ready" />
          ) : (
            <span className="rounded-full bg-warm px-2.5 py-0.5 text-[12px] font-semibold">
              {t.state.draftShort}
            </span>
          )}
        </div>
        <PhotoProgress count={count} />
        <span className="text-[13px] text-admin-muted">{c.autosave}</span>
      </div>

      {!set.canEdit ? (
        <div className="flex items-start gap-3 rounded-[14px] bg-info p-3.5 text-sm leading-5 text-info-foreground">
          <Info
            aria-hidden="true"
            strokeWidth={1.8}
            className="mt-0.5 size-4 shrink-0"
          />
          <p>{c.readOnly}</p>
        </div>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {upload.announcement}
      </p>
      {PHOTO_VIEWS.map((view) => {
        const photo = set.photos.find((p) => p.view === view);
        return (
          <PhotoSlot
            key={view}
            view={view}
            url={photo?.url ?? null}
            alt={photo ? alt(photo) : ""}
            caption={
              photo
                ? photo.uploadedByRole === "client"
                  ? c.uploadedYou(relativeWhen(photo.uploadedAt))
                  : c.uploadedStudio(relativeWhen(photo.uploadedAt))
                : t.poses[view]
            }
            layout="row"
            canEdit={set.canEdit}
            locked={false}
            upload={upload.slots[view]}
            picker="source"
            onFile={(file) => void upload.upload(view, file)}
            onDelete={() => void actions.remove(view)}
            deleting={actions.deleting === view}
            onCancel={() => upload.cancel(view)}
            onRetry={() => upload.retry(view)}
          />
        );
      })}

      <section
        aria-labelledby="tips"
        className="flex flex-col gap-2 rounded-[20px] border border-admin-line bg-card px-4 py-3.5"
      >
        <h2 id="tips" className="text-[15px] font-bold">
          {t.tips.title}
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-[18px] text-[13.5px] text-admin-muted">
          {t.tips.items.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      </section>

      {set.canEdit ? (
        <>
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!canSave}
            onClick={() => setConfirmOpen(true)}
          >
            <Lock aria-hidden="true" strokeWidth={1.8} />
            {t.actions.save}
          </Button>
          <p className="text-center text-[13px] text-admin-muted">
            {count === 3
              ? t.saveHint.ready
              : set.missing.length === 1
                ? t.saveHint.missingOne
                : t.saveHint.missingMany}
          </p>
          <SavePhotosDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            checkLabel={set.label}
            description={t.confirm.descriptionClient}
            checkText={t.confirm.checkClient}
            photos={set.photos}
            altOf={alt}
            pending={actions.saving}
            onConfirm={() => actions.save(() => setConfirmOpen(false))}
          />
        </>
      ) : null}
    </div>
  );
}

/** Pagina di un set del cliente: bozza (C23–C25) o salvato (C26). */
export function PhotoSetPage({ set }: { set: PhotoSetView }) {
  if (set.state === "saved") return <SavedSet set={set} />;
  if (set.state === "future") {
    return (
      <p className="rounded-[14px] bg-info p-3.5 text-sm leading-5 text-info-foreground">
        {t.errors.notOpen}
      </p>
    );
  }
  return <OpenSet set={set} />;
}
