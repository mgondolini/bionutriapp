"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Upload, X } from "lucide-react";
import { useId, useState, useTransition, type DragEvent } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  FILE_CATEGORIES,
  FILE_MIME_TYPE,
  FILE_NOTE_MAX,
  PDF_MAGIC,
  type FileUploadError,
} from "@/lib/constants/domain";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { copy } from "@/lib/copy/it";
import { checkDeclaredFile, hasPdfHeader } from "@/lib/files/file-checks";
import { dayInRome, formatFileSize } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { cn } from "@/lib/utils";
import {
  confirmUploadAction,
  prepareUploadAction,
} from "@/server/actions/files.actions";
import {
  fileFormSchema,
  type FileFormValues,
} from "@/server/validation/files.schema";

const t = copy.admin.clients.files.upload;
const errors = copy.files.uploadErrors;

const emptyValues = (): FileFormValues => ({
  category: "diet",
  title: "",
  validFrom: dayInRome(),
  note: "",
  notify: true,
});

/** Controlli nel browser prima del caricamento: tipo, dimensione e primi byte. */
async function checkFile(file: File): Promise<FileUploadError | null> {
  const declared = checkDeclaredFile(file);
  if (declared) return declared;
  const head = new Uint8Array(
    await file.slice(0, PDF_MAGIC.length).arrayBuffer(),
  );
  return hasPdfHeader(head) ? null : "invalid_pdf";
}

/** Storage risponde 400 con { statusCode: "413" } quando il file supera il limite del bucket. */
function isTooLarge(xhr: XMLHttpRequest): boolean {
  if (xhr.status === 413) return true;
  try {
    const body = JSON.parse(xhr.responseText) as { statusCode?: string };
    return body.statusCode === "413";
  } catch {
    return false;
  }
}

/**
 * Caricamento diretto su Storage con l'URL firmato, con avanzamento.
 * XMLHttpRequest perché fetch non riporta l'avanzamento dell'invio.
 */
function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<FileUploadError | null> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", FILE_MIME_TYPE);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(null);
      else resolve(isTooLarge(xhr) ? "too_large" : "upload_failed");
    };
    xhr.onerror = () => resolve("upload_failed");
    xhr.send(file);
  });
}

type Progress =
  { phase: "uploading"; percent: number } | { phase: "verifying" };

/**
 * Pubblicazione di un file (A-08, A-09, schermata A7) in tre passaggi:
 * prepareUpload (validazione e URL firmato) → caricamento diretto dal
 * browser su Storage → confirmUpload (verifica sul server e riga).
 */
export function FileUploadForm({ clientId }: { clientId: string }) {
  const hydrated = useHydrated();
  const ids = useId();
  // cambiare la chiave svuota l'input (si può riscegliere lo stesso file)
  const [inputKey, setInputKey] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<FileFormValues>({
    // raw: alla Server Action vanno i valori digitati, che li rivalida
    resolver: zodResolver(fileFormSchema, undefined, {
      raw: true,
    }) as unknown as Resolver<FileFormValues>,
    defaultValues: emptyValues(),
  });
  const note = useWatch({ control: form.control, name: "note" }) ?? "";
  const busy = isPending || progress !== null;

  const selectFile = async (selected: File | undefined) => {
    setError(null);
    if (!selected) return;
    const problem = await checkFile(selected);
    if (problem) {
      setFile(null);
      setFileError(errors[problem]);
      setInputKey((key) => key + 1);
      return;
    }
    setFileError(null);
    setFile(selected);
  };

  const clearFile = () => {
    setFile(null);
    setFileError(null);
    setInputKey((key) => key + 1);
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!busy) void selectFile(event.dataTransfer.files[0]);
  };

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    if (!file) {
      setFileError(copy.files.validation.fileRequired);
      return;
    }
    startTransition(async () => {
      const prepared = await prepareUploadAction({
        ...values,
        clientId,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      });
      if (redirectIfSignedOut(prepared)) return;
      if (!prepared.ok) {
        setError(prepared.error);
        return;
      }

      setProgress({ phase: "uploading", percent: 0 });
      const uploadError = await uploadWithProgress(
        prepared.data.uploadUrl,
        file,
        (percent) => setProgress({ phase: "uploading", percent }),
      );
      if (uploadError) {
        setProgress(null);
        setError(errors[uploadError]);
        return;
      }

      setProgress({ phase: "verifying" });
      const confirmed = await confirmUploadAction({
        ...values,
        clientId,
        fileId: prepared.data.fileId,
      });
      if (redirectIfSignedOut(confirmed)) return;
      setProgress(null);
      if (!confirmed.ok) {
        setError(confirmed.error);
        return;
      }
      toast.success(t.published(values.title.trim()));
      form.reset(emptyValues());
      clearFile();
    });
  });

  const fieldId = (name: string) => `${ids}-${name}`;
  const percent =
    progress?.phase === "uploading" ? progress.percent : progress ? 100 : 0;

  return (
    <section
      aria-labelledby={fieldId("title")}
      className="flex flex-col gap-5 rounded-xl border bg-card p-5 text-card-foreground"
    >
      <h2 id={fieldId("title")} className="text-base font-semibold">
        {t.title}
      </h2>

      <form
        method="post"
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-5"
      >
        {error ? <FormMessage>{error}</FormMessage> : null}

        <Controller
          name="category"
          control={form.control}
          render={({ field }) => (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">{t.category}</legend>
              <div className="flex flex-wrap gap-2">
                {FILE_CATEGORIES.map((category) => (
                  <label
                    key={category}
                    className={cn(
                      "flex h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                      field.value === category
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted",
                    )}
                  >
                    <input
                      type="radio"
                      name={field.name}
                      value={category}
                      checked={field.value === category}
                      onChange={() => field.onChange(category)}
                      disabled={busy}
                      className="size-4 accent-(--primary)"
                    />
                    {copy.domain.fileCategory[category]}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        />

        <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
          <div className="flex flex-col gap-2">
            {/* L'input è dentro l'etichetta: si attiva con clic, Invio o Spazio, e accetta il trascinamento. */}
            <label
              onDragOver={(event) => {
                event.preventDefault();
                if (!busy) setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                dragging ? "border-primary bg-primary/5" : "hover:bg-muted/60",
                fileError ? "border-destructive" : null,
                busy ? "pointer-events-none opacity-60" : null,
              )}
            >
              <input
                key={inputKey}
                type="file"
                accept={`${FILE_MIME_TYPE},.pdf`}
                className="sr-only"
                disabled={busy}
                aria-invalid={fileError ? true : undefined}
                aria-describedby={fieldId("file-status")}
                onChange={(event) => void selectFile(event.target.files?.[0])}
              />
              <Upload aria-hidden="true" className="size-7 text-primary" />
              <span className="font-medium">{t.dropzone}</span>
              <span className="text-sm text-muted-foreground">
                {t.dropzoneHint}
              </span>
              <span
                aria-hidden="true"
                className={buttonVariants({ variant: "outline" })}
              >
                {file ? t.changeFile : t.chooseFile}
              </span>
            </label>

            <div id={fieldId("file-status")} aria-live="polite">
              {file ? (
                <div className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2 text-sm">
                  <FileText
                    aria-hidden="true"
                    className="size-5 shrink-0 text-primary"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{file.name}</span>
                    <span className="text-muted-foreground">
                      {t.ready(formatFileSize(file.size))}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={clearFile}
                    disabled={busy}
                    aria-label={t.removeFile}
                  >
                    <X aria-hidden="true" />
                  </Button>
                </div>
              ) : null}
              {fileError ? (
                <p className="text-sm text-destructive" role="alert">
                  {fileError}
                </p>
              ) : null}
            </div>
          </div>

          <FieldGroup>
            <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
              <Controller
                name="title"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={fieldId("file-title")}>
                      {t.titleLabel}
                    </FieldLabel>
                    <Input
                      {...field}
                      id={fieldId("file-title")}
                      autoComplete="off"
                      placeholder={t.titlePlaceholder}
                      disabled={busy}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
              <Controller
                name="validFrom"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={fieldId("valid-from")}>
                      {t.validFrom}
                    </FieldLabel>
                    <Input
                      {...field}
                      id={fieldId("valid-from")}
                      type="date"
                      disabled={busy}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            </div>

            <Controller
              name="note"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={fieldId("note")}>{t.note}</FieldLabel>
                  <textarea
                    {...field}
                    id={fieldId("note")}
                    rows={3}
                    maxLength={FILE_NOTE_MAX}
                    placeholder={t.notePlaceholder}
                    disabled={busy}
                    aria-invalid={fieldState.invalid}
                    aria-describedby={fieldId("note-count")}
                    className="min-h-20 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm"
                  />
                  <FieldDescription id={fieldId("note-count")}>
                    {t.noteCount(note.length, FILE_NOTE_MAX)}
                  </FieldDescription>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />

            <Controller
              name="notify"
              control={form.control}
              render={({ field }) => (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border p-3 has-focus-visible:ring-3 has-focus-visible:ring-ring/50">
                  <input
                    type="checkbox"
                    name={field.name}
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                    disabled={busy}
                    aria-describedby={fieldId("notify-hint")}
                    className="mt-0.5 size-4 accent-(--primary)"
                  />
                  <span className="flex flex-col gap-0.5 text-sm">
                    <span className="font-medium">{t.notify}</span>
                    <span
                      id={fieldId("notify-hint")}
                      className="text-muted-foreground"
                    >
                      {t.notifyHint}
                    </span>
                  </span>
                </label>
              )}
            />
          </FieldGroup>
        </div>

        {progress ? (
          <div className="flex flex-col gap-1.5">
            <div
              role="progressbar"
              aria-label={t.progressLabel}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-2 overflow-hidden rounded-full bg-muted"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {progress.phase === "uploading"
                ? t.uploading(progress.percent)
                : t.verifying}
            </p>
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={!hydrated || busy}
          className="self-start"
        >
          <Upload aria-hidden="true" />
          {t.submit}
        </Button>
      </form>
    </section>
  );
}
