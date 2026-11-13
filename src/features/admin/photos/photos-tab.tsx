"use client";

import { Camera, Info, Maximize2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { savedParts, shortWhenAt } from "@/components/shared/photos/labels";
import { PhotoSetCard } from "@/components/shared/photos/photo-set-card";
import { PhotoFrame, PhotoSlot } from "@/components/shared/photos/photo-slot";
import { PhotoViewer } from "@/components/shared/photos/photo-viewer";
import { usePhotoSetActions } from "@/components/shared/photos/use-photo-set-actions";
import { usePhotoUpload } from "@/components/shared/photos/use-photo-upload";
import { Button, buttonVariants } from "@/components/ui/button";
import { PHOTO_VIEWS, clientDetailPath } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatDayMonthShort, formatLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  PhotoSetView,
  StaffPhotos,
} from "@/server/services/photos.service";

import { StartPhotosBanner } from "@/features/admin/onboarding-prep/start-photos-banner";

import { altOf, captionOf, whoOf } from "./labels";
import { UploadPhotosDialog } from "./upload-photos-dialog";

const t = copy.photos;
const a = copy.photos.admin;

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-[14px] bg-info p-3.5 text-sm leading-5 text-info-foreground">
      <Info
        aria-hidden="true"
        strokeWidth={1.8}
        className="mt-0.5 size-4 shrink-0"
      />
      <p>{children}</p>
    </div>
  );
}

/** Set da completare (A20–A22): comandi sulle foto, pannello di caricamento, salvataggio. */
function OpenSet({ set, data }: { set: PhotoSetView; data: StaffPhotos }) {
  const upload = usePhotoUpload(set.sessionId);
  const actions = usePhotoSetActions(set.sessionId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const count = set.photos.length;
  const reminders = data.reminders[set.sessionId] ?? [];

  const actionLabel =
    set.state === "ready"
      ? a.review
      : count === 0
        ? a.start
        : set.missing.length === 1
          ? a.addMissingOne
          : a.addMissingMany;

  return (
    <PhotoSetCard
      id={`set-${set.sessionId}`}
      title={set.label}
      state={set.state}
      count={count}
      subtitle={`${formatLongDate(set.date)} · ${a.ordinal(set.ordinal)}`}
      action={
        <Button
          type="button"
          variant="action"
          onClick={() => setDialogOpen(true)}
        >
          <Camera aria-hidden="true" strokeWidth={1.8} />
          {actionLabel}
        </Button>
      }
    >
      <p aria-live="polite" className="sr-only">
        {upload.announcement}
      </p>
      <div className="flex flex-wrap items-start gap-8">
        <div className="grid w-full max-w-[632px] grid-cols-3 gap-3 sm:gap-4">
          {PHOTO_VIEWS.map((view) => {
            const photo = set.photos.find((p) => p.view === view);
            return (
              <PhotoSlot
                key={view}
                view={view}
                url={photo?.url ?? null}
                alt={photo ? altOf(set)(photo) : ""}
                caption={captionOf(photo, data.firstName)}
                layout="tile"
                canEdit={set.canEdit}
                locked={false}
                upload={upload.slots[view]}
                picker="file"
                onFile={(file) => void upload.upload(view, file)}
                onDelete={() => void actions.remove(view)}
                deleting={actions.deleting === view}
                onCancel={() => upload.cancel(view)}
                onRetry={() => upload.retry(view)}
              />
            );
          })}
        </div>
        <div className="flex min-w-[260px] flex-[1_1_300px] flex-col gap-4">
          <dl className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-2.5 text-sm">
            {PHOTO_VIEWS.map((view) => {
              const photo = set.photos.find((p) => p.view === view);
              return (
                <div key={view} className="contents">
                  <dt className="text-[13px] text-admin-muted">
                    {t.views[view]}
                  </dt>
                  <dd className={photo ? undefined : "font-semibold"}>
                    {photo
                      ? a.byLine(
                          whoOf(photo, data.firstName),
                          shortWhenAt(photo.uploadedAt),
                        )
                      : t.missing}
                  </dd>
                </div>
              );
            })}
          </dl>
          <Callout>
            {set.state === "ready"
              ? a.infoReady(data.firstName)
              : a.infoDraft(data.firstName)}
          </Callout>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-[12px] leading-[18px] font-semibold",
                data.pushEnabled ? "bg-wash" : "bg-warm",
              )}
            >
              {data.pushEnabled ? a.pushActive : a.pushInactive}
            </span>
            <span className="text-[13px] text-admin-muted">
              {!data.pushEnabled
                ? a.remindersOff
                : reminders.length > 0
                  ? a.remindersSent(
                      reminders
                        .map((day) => formatDayMonthShort(day))
                        .join(", "),
                    )
                  : a.remindersNone}
            </span>
          </div>
        </div>
      </div>
      <UploadPhotosDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        set={set}
        data={data}
        upload={upload}
        actions={actions}
      />
    </PhotoSetCard>
  );
}

/** Set salvato (A20, A23): nessun comando, apertura a schermo intero. */
function SavedSet({ set, data }: { set: PhotoSetView; data: StaffPhotos }) {
  const [viewer, setViewer] = useState<{
    open: boolean;
    view: (typeof PHOTO_VIEWS)[number];
  }>({
    open: false,
    view: "front",
  });
  const saved = set.savedAt ? savedParts(set.savedAt) : null;
  const savedLine = saved
    ? set.savedByRole === "client"
      ? a.savedBy(data.firstName, saved.date, saved.time)
      : a.savedByStudio(saved.date, saved.time)
    : "";
  const alt = altOf(set);

  return (
    <PhotoSetCard
      id={`set-${set.sessionId}`}
      title={set.label}
      state="saved"
      count={3}
      subtitle={`${formatLongDate(set.date)} · ${savedLine}`}
      action={
        <Button
          type="button"
          variant="neutral"
          onClick={() => setViewer({ open: true, view: "front" })}
        >
          <Maximize2 aria-hidden="true" strokeWidth={1.8} />
          {t.actions.openFull}
        </Button>
      }
    >
      <div className="flex flex-wrap items-start gap-8">
        <div className="grid w-full max-w-[632px] grid-cols-3 gap-3 sm:gap-4">
          {set.photos.map((photo) => (
            <div key={photo.view} className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setViewer({ open: true, view: photo.view })}
                aria-label={t.actions.openPhoto(t.views[photo.view])}
                className="block rounded-[14px] outline-none focus-visible:ring-3 focus-visible:ring-foreground"
              >
                <PhotoFrame
                  view={photo.view}
                  url={photo.url}
                  alt={alt(photo)}
                  locked
                />
              </button>
              <span className="text-[13px] leading-5 text-admin-muted">
                {captionOf(photo, data.firstName)}
              </span>
            </div>
          ))}
        </div>
        <div className="min-w-[260px] flex-[1_1_300px]">
          <Callout>{a.infoSaved}</Callout>
        </div>
      </div>
      <PhotoViewer
        open={viewer.open}
        onOpenChange={(open) => setViewer((current) => ({ ...current, open }))}
        photos={set.photos}
        initialView={viewer.view}
        checkLabel={set.label}
        subtitle={`${formatLongDate(set.date)} · ${data.fullName}`}
        altOf={alt}
        details={(photo) => [
          { label: t.viewer.check, value: set.label },
          { label: t.viewer.date, value: formatLongDate(set.date) },
          { label: t.viewer.view, value: t.views[photo.view] },
          {
            label: t.viewer.uploadedBy,
            value: a.byLine(
              whoOf(photo, data.firstName),
              shortWhenAt(photo.uploadedAt),
            ),
          },
          ...(set.savedAt
            ? [{ label: t.viewer.savedAt, value: shortWhenAt(set.savedAt) }]
            : []),
        ]}
      />
    </PhotoSetCard>
  );
}

/** Scheda Foto del cliente (A20): set da completare, salvati, prossimi. */
export function PhotosTab({
  data,
  onboarding = false,
}: {
  data: StaffPhotos;
  /** Cliente in Onboarding: banner delle foto di partenza ricevute (A27). */
  onboarding?: boolean;
}) {
  const total = data.sets.length;
  const startSet = onboarding
    ? data.sets.find((set) => set.checkNumber === null)
    : undefined;
  return (
    <div className="flex flex-col gap-5">
      <section
        aria-labelledby="photos-title"
        className="flex flex-wrap items-start justify-between gap-4 rounded-[20px] border border-admin-line bg-card p-5 sm:p-6"
      >
        <div className="flex max-w-[700px] flex-col gap-1">
          <h2
            id="photos-title"
            className="text-xl leading-[26px] font-bold tracking-tight"
          >
            {a.title}
          </h2>
          <p className="text-sm text-admin-muted">{a.intro(data.firstName)}</p>
        </div>
        {total > 0 ? (
          <span className="rounded-full bg-admin-hover px-3 py-1.5 text-[13px] font-semibold text-admin-muted">
            {a.savedCount(data.savedCount, total)}
          </span>
        ) : null}
      </section>

      {startSet ? (
        <StartPhotosBanner set={startSet} firstName={data.firstName} />
      ) : null}

      {total === 0 ? (
        <EmptyState
          icon={Camera}
          title={a.emptyTitle}
          description={a.emptyDescription}
          action={
            <Link
              href={clientDetailPath(data.clientId, "percorso")}
              className={buttonVariants({ variant: "neutral" })}
            >
              {a.emptyAction}
            </Link>
          }
        />
      ) : null}

      {data.sets.map((set) =>
        set.state === "saved" ? (
          <SavedSet key={set.sessionId} set={set} data={data} />
        ) : set.state === "future" ? (
          <PhotoSetCard
            key={set.sessionId}
            id={`set-${set.sessionId}`}
            title={set.label}
            state="future"
            count={0}
            subtitle={a.future(formatLongDate(set.date), data.firstName)}
            aside={a.futureHint}
          />
        ) : (
          <OpenSet key={set.sessionId} set={set} data={data} />
        ),
      )}
    </div>
  );
}
