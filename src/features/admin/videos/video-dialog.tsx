"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { FormMessage } from "@/components/shared/form-message";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { RichNoteField } from "@/components/shared/rich-text/rich-note-field";
import { VideoThumbnail } from "@/components/shared/video-thumbnail";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { VIDEO_NOTE_MAX, VIDEO_TITLE_MAX } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import type { NoteDoc } from "@/lib/domain/client-notes/content";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { youtubeShortLabel } from "@/lib/videos/youtube";
import {
  addVideoAction,
  checkVideoLinkAction,
  updateVideoAction,
  type VideoLinkPreview,
} from "@/server/actions/videos.actions";
import type { FolderOption } from "@/server/services/videos.service";
import { addVideoSchema } from "@/server/validation/videos.schema";

import {
  LinkErrorBox,
  SELECT_CLASS,
  isLinkErrorCode,
  type LinkErrorCode,
} from "./video-form-parts";

const t = copy.admin.videos.videoForm;

type VideoFormValues = z.input<typeof addVideoSchema>;
type FieldName = keyof VideoFormValues;

export type VideoDialogMode =
  | { kind: "add"; folderId: string | null }
  | {
      kind: "edit";
      video: {
        id: string;
        youtubeId: string;
        title: string;
        folderId: string;
        note: NoteDoc | null;
      };
    };

type LinkState =
  | { status: "idle" }
  | { status: "checking"; url: string }
  | { status: "ok"; url: string; preview: VideoLinkPreview }
  | { status: "error"; url: string; code: LinkErrorCode };

/**
 * Aggiunta (A14, A15) e modifica di un video. Il link si verifica sul server
 * (oEmbed) al clic su "Verifica" o quando si lascia il campo: con un video
 * valido compaiono anteprima e titolo; con un errore il salvataggio resta
 * bloccato. In modifica il link non cambia (un altro video = nuovo video).
 */
export function VideoDialog({
  mode,
  folders,
  open,
  onOpenChange,
  trigger,
}: {
  mode: VideoDialogMode;
  folders: FolderOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactElement;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<LinkState>({ status: "idle" });
  const [isPending, startTransition] = useTransition();
  const [, startCheck] = useTransition();
  const editing = mode.kind === "edit";
  const defaults: VideoFormValues = editing
    ? {
        url: youtubeShortLabel(mode.video.youtubeId),
        title: mode.video.title,
        folderId: mode.video.folderId,
        note: mode.video.note ? JSON.stringify(mode.video.note) : "",
        notify: false,
      }
    : {
        url: "",
        title: "",
        folderId: mode.folderId ?? folders[0]?.id ?? "",
        note: "",
        notify: false,
      };
  const form = useForm<VideoFormValues>({
    resolver: zodResolver(addVideoSchema, undefined, {
      raw: true,
    }) as unknown as Resolver<VideoFormValues>,
    defaultValues: defaults,
  });
  const [url, folderId] = useWatch({
    control: form.control,
    name: ["url", "folderId"],
  });
  const [noteCount, setNoteCount] = useState(0);
  const audience = folders.find((f) => f.id === folderId)?.audience ?? 0;
  const fieldId = (key: string) => `video-${mode.kind}-${key}`;

  const verified = editing || (link.status === "ok" && link.url === url.trim());
  const showFields = editing || link.status === "ok";

  const changeOpen = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      form.reset(defaults);
      setError(null);
      setLink({ status: "idle" });
    }
  };

  const checkLink = () => {
    const value = form.getValues("url").trim();
    if (!value || editing) return;
    if (link.status !== "idle" && link.url === value) return;
    setLink({ status: "checking", url: value });
    startCheck(async () => {
      const result = await checkVideoLinkAction({ url: value });
      if (redirectIfSignedOut(result)) return;
      if (form.getValues("url").trim() !== value) return; // link cambiato
      if (result.ok) {
        setLink({ status: "ok", url: value, preview: result.data });
        if (!form.getValues("title") && result.data.title) {
          form.setValue("title", result.data.title.slice(0, VIDEO_TITLE_MAX), {
            shouldValidate: true,
          });
        }
        return;
      }
      setLink({
        status: "error",
        url: value,
        code: isLinkErrorCode(result.error) ? result.error : "check_failed",
      });
    });
  };

  const applyErrors = (fieldErrors?: Record<string, string[] | undefined>) => {
    for (const [field, messages] of Object.entries(fieldErrors ?? {})) {
      if (messages?.[0] && field in defaults) {
        form.setError(field as FieldName, { message: messages[0] });
      }
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    if (!verified) {
      checkLink();
      return;
    }
    setError(null);
    startTransition(async () => {
      const result =
        mode.kind === "edit"
          ? await updateVideoAction({
              videoId: mode.video.id,
              title: values.title,
              folderId: values.folderId,
              note: values.note,
            })
          : await addVideoAction(values);
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        if (isLinkErrorCode(result.error)) {
          setLink({
            status: "error",
            url: values.url.trim(),
            code: result.error,
          });
          return;
        }
        setError(result.error);
        applyErrors(result.fieldErrors);
        return;
      }
      changeOpen(false);
      toast.success(editing ? t.saved : t.added(values.title.trim()));
      router.refresh();
    });
  });

  const preview = link.status === "ok" ? link.preview : null;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={changeOpen}
      trigger={trigger}
      title={editing ? t.editTitle : t.addTitle}
      description={editing ? undefined : t.addDescription}
      dialogClassName="sm:max-w-[620px]"
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {error ? <FormMessage>{error}</FormMessage> : null}
        <FieldGroup>
          {editing ? (
            <div className="flex items-center gap-3.5">
              <VideoThumbnail
                youtubeId={mode.video.youtubeId}
                className="w-[120px]"
              />
              <div className="flex min-w-0 flex-col">
                <span className="text-[13px] font-semibold">{t.link}</span>
                <span className="truncate text-sm text-admin-muted">
                  {youtubeShortLabel(mode.video.youtubeId)}
                </span>
              </div>
            </div>
          ) : (
            <Controller
              name="url"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid || link.status === "error"}
                >
                  <FieldLabel htmlFor={fieldId("url")}>{t.link}</FieldLabel>
                  <div className="flex gap-2">
                    <Input
                      {...field}
                      onBlur={() => {
                        field.onBlur();
                        checkLink();
                      }}
                      id={fieldId("url")}
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      placeholder={t.linkPlaceholder}
                      className={
                        link.status === "ok" && link.url === url.trim()
                          ? "border-action"
                          : undefined
                      }
                      aria-invalid={
                        fieldState.invalid || link.status === "error"
                      }
                      aria-describedby={
                        link.status === "error"
                          ? fieldId("url-error")
                          : fieldId("url-hint")
                      }
                    />
                    <Button
                      type="button"
                      variant="neutral"
                      onClick={checkLink}
                      disabled={link.status === "checking"}
                    >
                      {t.verify}
                    </Button>
                  </div>
                  <FieldError errors={[fieldState.error]} />
                  <p aria-live="polite" className="text-sm">
                    {link.status === "checking" ? (
                      <span className="flex items-center gap-2 text-admin-muted">
                        <Loader2
                          aria-hidden="true"
                          className="size-4 animate-spin"
                        />
                        {t.checking}
                      </span>
                    ) : link.status === "ok" ? (
                      <span className="flex items-center gap-2 font-semibold text-foreground">
                        <CircleCheck aria-hidden="true" className="size-4" />
                        {t.found}
                      </span>
                    ) : null}
                  </p>
                  {link.status === "error" ? (
                    <LinkErrorBox code={link.code} id={fieldId("url-error")} />
                  ) : (
                    <p
                      id={fieldId("url-hint")}
                      className="rounded-xl bg-info px-4 py-3.5 text-sm text-info-foreground"
                    >
                      {t.accepted}
                    </p>
                  )}
                </Field>
              )}
            />
          )}

          {preview ? (
            <div className="flex items-center gap-4 rounded-2xl border border-video bg-video-tint p-3.5">
              <VideoThumbnail
                youtubeId={preview.youtubeId}
                className="w-[120px]"
              />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="self-start rounded-full bg-video px-2.5 py-0.5 text-xs leading-[18px] font-semibold text-foreground">
                  {t.previewAlt}
                </span>
                <span className="mt-1.5 line-clamp-2 text-[15px] leading-[22px] font-bold">
                  {preview.title}
                </span>
                {preview.authorName ? (
                  <span className="text-xs text-admin-muted">
                    {t.author(preview.authorName)}
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {showFields ? (
            <>
              <Controller
                name="title"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={fieldId("title")}>
                      {t.title}
                    </FieldLabel>
                    <Input
                      {...field}
                      id={fieldId("title")}
                      autoComplete="off"
                      maxLength={VIDEO_TITLE_MAX}
                      aria-invalid={fieldState.invalid}
                      aria-describedby={fieldId("title-hint")}
                    />
                    <FieldDescription id={fieldId("title-hint")}>
                      {t.titleHint}
                    </FieldDescription>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                name="folderId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={fieldId("folder")}>
                      {t.folder}
                    </FieldLabel>
                    <select
                      {...field}
                      id={fieldId("folder")}
                      aria-invalid={fieldState.invalid}
                      className={SELECT_CLASS}
                    >
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.label}
                        </option>
                      ))}
                    </select>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                name="note"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <FieldLabel
                        htmlFor={fieldId("note")}
                        id={fieldId("note-label")}
                      >
                        {t.note}{" "}
                        <span className="font-normal text-admin-muted">
                          {t.noteOptional}
                        </span>
                      </FieldLabel>
                      <span className="text-[12.5px] text-admin-muted">
                        {t.noteSameEditor}
                      </span>
                    </div>
                    <RichNoteField
                      id={fieldId("note")}
                      value={field.value}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      label={t.note}
                      placeholder={t.notePlaceholder}
                      describedBy={fieldId("note-hint")}
                      invalid={fieldState.invalid || noteCount > VIDEO_NOTE_MAX}
                      onCount={setNoteCount}
                    />
                    <div
                      id={fieldId("note-hint")}
                      className="flex items-start justify-between gap-3 text-[13px] text-admin-muted"
                    >
                      <span>{t.noteHint}</span>
                      <span
                        className={cn(
                          "shrink-0 tabular-nums",
                          noteCount > VIDEO_NOTE_MAX &&
                            "font-semibold text-warning-foreground",
                        )}
                      >
                        {t.count(
                          formatNumber(noteCount),
                          formatNumber(VIDEO_NOTE_MAX),
                        )}
                      </span>
                    </div>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              {editing ? null : (
                <Controller
                  name="notify"
                  control={form.control}
                  render={({ field }) => (
                    <label className="flex cursor-pointer items-start gap-3 rounded-[14px] bg-admin-hover p-3.5 has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
                      <input
                        type="checkbox"
                        name={field.name}
                        checked={field.value}
                        onChange={(event) =>
                          field.onChange(event.target.checked)
                        }
                        aria-describedby={fieldId("notify-hint")}
                        className="mt-0.5 size-[22px] shrink-0 accent-(--action)"
                      />
                      <span className="flex flex-col gap-0.5 text-sm">
                        <span className="font-semibold">{t.notify}</span>
                        <span
                          id={fieldId("notify-hint")}
                          className="text-[12.5px] text-foreground"
                        >
                          {t.notifyHint(audience)}
                        </span>
                      </span>
                    </label>
                  )}
                />
              )}
            </>
          ) : null}
        </FieldGroup>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="neutral"
            onClick={() => changeOpen(false)}
          >
            {t.cancel}
          </Button>
          <Button
            type="submit"
            variant="action"
            disabled={isPending || !verified}
          >
            {isPending
              ? editing
                ? t.saving
                : t.adding
              : editing
                ? t.save
                : t.add}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
