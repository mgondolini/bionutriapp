"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import {
  PHOTO_UPLOAD_TYPE,
  PHOTO_VIEWS,
  type PhotoView,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { PhotoPrepareError, prepareImage } from "@/lib/photos/prepare-image";
import {
  confirmPhotoUploadAction,
  preparePhotoUploadAction,
} from "@/server/actions/photos.actions";

const t = copy.photos.upload;

export type SlotUpload =
  | { phase: "idle" }
  | { phase: "preparing" }
  | { phase: "uploading"; percent: number }
  | { phase: "confirming" }
  | { phase: "error"; message: string };

const IDLE: SlotUpload = { phase: "idle" };

type PutResult = "ok" | "too_large" | "network" | "aborted";

/** PUT diretto su Storage con l'URL firmato; XHR per l'avanzamento e l'annullamento. */
function put(
  url: string,
  body: Blob,
  xhr: XMLHttpRequest,
  onProgress: (percent: number) => void,
): Promise<PutResult> {
  return new Promise((resolve) => {
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", PHOTO_UPLOAD_TYPE);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve("ok");
      let tooLarge = xhr.status === 413;
      try {
        tooLarge ||=
          (JSON.parse(xhr.responseText) as { statusCode?: string })
            .statusCode === "413";
      } catch {
        // risposta non JSON
      }
      resolve(tooLarge ? "too_large" : "network");
    };
    xhr.onerror = () => resolve("network");
    xhr.onabort = () => resolve("aborted");
    xhr.send(body);
  });
}

/**
 * Caricamento delle foto di un set, una vista alla volta e anche in
 * parallelo: conversione nel browser → preparePhotoUploadAction (URL
 * firmato) → PUT con avanzamento → confirmPhotoUploadAction (verifica sul
 * server). La foto è subito una bozza: nessun "salva bozza".
 * `announcement` è il testo per la regione aria-live (avanzamento ed esiti).
 */
export function usePhotoUpload(sessionId: string) {
  const router = useRouter();
  const [slots, setSlots] = useState<Record<PhotoView, SlotUpload>>(
    () =>
      Object.fromEntries(PHOTO_VIEWS.map((view) => [view, IDLE])) as Record<
        PhotoView,
        SlotUpload
      >,
  );
  const [announcement, setAnnouncement] = useState("");
  const requests = useRef(new Map<PhotoView, XMLHttpRequest>());
  const lastFiles = useRef(new Map<PhotoView, File>());

  const set = useCallback((view: PhotoView, state: SlotUpload) => {
    setSlots((current) => ({ ...current, [view]: state }));
  }, []);

  const fail = useCallback(
    (view: PhotoView, message: string) => {
      set(view, { phase: "error", message });
      setAnnouncement(message);
    },
    [set],
  );

  const upload = useCallback(
    async (view: PhotoView, file: File) => {
      lastFiles.current.set(view, file);
      const name = copy.photos.views[view];
      set(view, { phase: "preparing" });
      setAnnouncement(t.preparing);

      let blob: Blob;
      try {
        blob = await prepareImage(file);
      } catch (error) {
        const code =
          error instanceof PhotoPrepareError ? error.code : "decode_failed";
        return fail(view, t.errors[code]);
      }

      const prepared = await preparePhotoUploadAction({ sessionId, view });
      if (redirectIfSignedOut(prepared)) return;
      if (!prepared.ok) return fail(view, prepared.error);

      const xhr = new XMLHttpRequest();
      requests.current.set(view, xhr);
      let lastAnnounced = -1;
      set(view, { phase: "uploading", percent: 0 });
      const result = await put(
        prepared.data.uploadUrl,
        blob,
        xhr,
        (percent) => {
          set(view, { phase: "uploading", percent });
          // annuncio ogni 25%: abbastanza per sapere che procede, senza rumore
          if (percent - lastAnnounced >= 25 || percent === 100) {
            lastAnnounced = percent;
            setAnnouncement(t.progressAria(name.toLowerCase(), percent));
          }
        },
      );
      requests.current.delete(view);
      if (result === "aborted") {
        set(view, IDLE);
        setAnnouncement("");
        return;
      }
      if (result !== "ok") {
        return fail(
          view,
          t.errors[result === "too_large" ? "too_large" : "network"],
        );
      }

      set(view, { phase: "confirming" });
      const confirmed = await confirmPhotoUploadAction({
        sessionId,
        view,
        objectId: prepared.data.objectId,
      });
      if (redirectIfSignedOut(confirmed)) return;
      if (!confirmed.ok) return fail(view, confirmed.error);

      lastFiles.current.delete(view);
      set(view, IDLE);
      setAnnouncement(t.done(name));
      router.refresh();
    },
    [fail, router, sessionId, set],
  );

  const cancel = useCallback((view: PhotoView) => {
    requests.current.get(view)?.abort();
  }, []);

  const retry = useCallback(
    (view: PhotoView) => {
      const file = lastFiles.current.get(view);
      if (file) void upload(view, file);
      else set(view, IDLE);
    },
    [set, upload],
  );

  const dismiss = useCallback((view: PhotoView) => set(view, IDLE), [set]);

  const busy = PHOTO_VIEWS.some(
    (view) => slots[view].phase !== "idle" && slots[view].phase !== "error",
  );

  return { slots, upload, cancel, retry, dismiss, announcement, busy };
}
