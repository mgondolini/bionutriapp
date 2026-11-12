"use client";

import { Lock, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { PhotoProgress } from "@/components/shared/photos/photo-status-badge";
import { PhotoSlot } from "@/components/shared/photos/photo-slot";
import { SavePhotosDialog } from "@/components/shared/photos/save-photos-dialog";
import type { usePhotoSetActions } from "@/components/shared/photos/use-photo-set-actions";
import type { usePhotoUpload } from "@/components/shared/photos/use-photo-upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { PHOTO_VIEWS } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { canSavePhotoSet } from "@/lib/photos/status";
import type {
  PhotoSetView,
  StaffPhotos,
} from "@/server/services/photos.service";

import { altOf, captionOf } from "./labels";

const t = copy.photos;
const a = copy.photos.admin;

/**
 * Caricamento per il cliente (A21): tre spazi con trascinamento o "Scegli
 * un file", stesse regole del cliente. "Salva le foto" resta spento finché
 * non ci sono tutte e tre; apre la conferma (A22).
 */
export function UploadPhotosDialog({
  open,
  onOpenChange,
  set,
  data,
  upload,
  actions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  set: PhotoSetView;
  data: StaffPhotos;
  upload: ReturnType<typeof usePhotoUpload>;
  actions: ReturnType<typeof usePhotoSetActions>;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const views = set.photos.map((p) => p.view);
  const canSave =
    canSavePhotoSet({ setStatus: "draft", views }) && !upload.busy;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[calc(100%-1rem)] gap-5 sm:max-w-[940px]">
          <div className="flex flex-col gap-1 pr-10">
            <DialogTitle>{a.dialogTitle(set.label, data.fullName)}</DialogTitle>
            <DialogDescription>{a.dialogDescription}</DialogDescription>
          </div>
          <div className="flex items-center gap-3.5">
            <span className="text-sm font-bold whitespace-nowrap">
              {t.countOf(views.length)}
            </span>
            <PhotoProgress
              count={views.length}
              className="max-w-[280px] flex-1"
            />
          </div>
          <p aria-live="polite" className="sr-only">
            {upload.announcement}
          </p>
          <div className="grid grid-cols-1 gap-5 min-[480px]:grid-cols-3">
            {PHOTO_VIEWS.map((view) => {
              const photo = set.photos.find((p) => p.view === view);
              return (
                <PhotoSlot
                  key={view}
                  view={view}
                  url={photo?.url ?? null}
                  alt={photo ? altOf(set)(photo) : ""}
                  caption={
                    photo ? captionOf(photo, data.firstName) : t.upload.formats
                  }
                  layout="tile"
                  canEdit={set.canEdit}
                  locked={false}
                  upload={upload.slots[view]}
                  picker="file"
                  dropHint
                  onFile={(file) => void upload.upload(view, file)}
                  onDelete={() => void actions.remove(view)}
                  deleting={actions.deleting === view}
                  onCancel={() => upload.cancel(view)}
                  onRetry={() => upload.retry(view)}
                />
              );
            })}
          </div>
          <div className="flex items-start gap-3 rounded-[14px] bg-warning p-3.5 text-sm leading-5 text-warning-foreground">
            <TriangleAlert
              aria-hidden="true"
              strokeWidth={1.8}
              className="mt-0.5 size-4 shrink-0"
            />
            <p>
              <b>{a.warnTitle}</b> {a.warn}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            {!canSave ? (
              <span className="mr-auto text-[13px] text-admin-muted">
                {t.saveHint.staff}
              </span>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
            >
              {a.closeDraft}
            </Button>
            <Button
              type="button"
              variant="action"
              disabled={!canSave}
              onClick={() => setConfirmOpen(true)}
            >
              <Lock aria-hidden="true" strokeWidth={1.8} />
              {t.actions.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <SavePhotosDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        checkLabel={set.label}
        description={t.confirm.descriptionStaff(data.firstName)}
        checkText={t.confirm.checkStaff}
        photos={set.photos}
        altOf={altOf(set)}
        pending={actions.saving}
        onConfirm={() =>
          actions.save(() => {
            setConfirmOpen(false);
            onOpenChange(false);
          })
        }
      />
    </>
  );
}
