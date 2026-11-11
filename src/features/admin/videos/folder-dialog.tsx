"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
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
import {
  VIDEO_FOLDER_DESCRIPTION_MAX,
  VIDEO_FOLDER_NAME_MAX,
  adminVideoFolderUrl,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";
import {
  createFolderAction,
  updateFolderAction,
} from "@/server/actions/videos.actions";
import {
  VIDEO_FOLDER_VISIBILITIES,
  folderFormSchema,
  type FolderFormValues,
} from "@/server/validation/videos.schema";

import { TEXTAREA_CLASS } from "./video-form-parts";

const t = copy.admin.videos.folderForm;

const VISIBILITY_COPY = {
  active: t.visibilityActive,
  onboarding: t.visibilityOnboarding,
} as const;

export type FolderDialogMode =
  | { kind: "create"; parent: { id: string; name: string } | null }
  | {
      kind: "edit";
      folder: {
        id: string;
        name: string;
        description: string | null;
        visibleInOnboarding: boolean;
      };
      parent: { name: string } | null;
    };

/**
 * Nuova cartella, nuova sottocartella o modifica (mockup v4, A16). La
 * visibilità si sceglie solo per le cartelle: le sottocartelle seguono la
 * cartella che le contiene (lo garantisce anche il trigger del database).
 */
export function FolderDialog({
  mode,
  open,
  onOpenChange,
  trigger,
}: {
  mode: FolderDialogMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactElement;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const defaults: FolderFormValues =
    mode.kind === "edit"
      ? {
          name: mode.folder.name,
          description: mode.folder.description ?? "",
          visibility: mode.folder.visibleInOnboarding ? "onboarding" : "active",
        }
      : { name: "", description: "", visibility: "active" };
  const form = useForm<FolderFormValues>({
    resolver: zodResolver(folderFormSchema, undefined, {
      raw: true,
    }) as unknown as Resolver<FolderFormValues>,
    defaultValues: defaults,
  });
  const name = useWatch({ control: form.control, name: "name" });
  const description = useWatch({ control: form.control, name: "description" });
  const parentName = mode.parent?.name ?? null;
  const fieldId = (key: string) => `video-folder-${key}`;

  const changeOpen = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      form.reset(defaults);
      setError(null);
    }
  };

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result =
        mode.kind === "edit"
          ? await updateFolderAction({ ...values, folderId: mode.folder.id })
          : await createFolderAction({
              ...values,
              parentId: mode.parent?.id ?? null,
            });
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setError(result.error);
        for (const [field, messages] of Object.entries(
          result.fieldErrors ?? {},
        )) {
          if (messages?.[0] && field in defaults) {
            form.setError(field as keyof FolderFormValues, {
              message: messages[0],
            });
          }
        }
        return;
      }
      changeOpen(false);
      if (mode.kind === "edit") {
        toast.success(t.saved);
        router.refresh();
      } else {
        toast.success(t.created(values.name.trim()));
        const created = result.data as { id: string };
        router.push(adminVideoFolderUrl(created.id));
      }
    });
  });

  const title =
    mode.kind === "edit"
      ? t.editTitle
      : parentName
        ? t.createSubTitle(parentName)
        : t.createTitle;

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={changeOpen}
      trigger={trigger}
      title={title}
      description={t.description}
      dialogClassName="sm:max-w-[560px]"
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {error ? <FormMessage>{error}</FormMessage> : null}
        <FieldGroup>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={fieldId("name")}>{t.name}</FieldLabel>
                <Input
                  {...field}
                  id={fieldId("name")}
                  autoComplete="off"
                  maxLength={VIDEO_FOLDER_NAME_MAX}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldId("name-hint")}
                />
                <FieldDescription id={fieldId("name-hint")}>
                  {t.nameHint(name.length, VIDEO_FOLDER_NAME_MAX)}
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="description"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={fieldId("description")}>
                  {t.descriptionLabel}
                </FieldLabel>
                <textarea
                  {...field}
                  id={fieldId("description")}
                  rows={2}
                  maxLength={VIDEO_FOLDER_DESCRIPTION_MAX}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldId("description-count")}
                  className={TEXTAREA_CLASS}
                />
                <FieldDescription id={fieldId("description-count")}>
                  {copy.admin.videos.videoForm.count(
                    description.length,
                    VIDEO_FOLDER_DESCRIPTION_MAX,
                  )}
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          {parentName ? (
            <p className="rounded-xl bg-admin-hover px-4 py-3 text-sm text-admin-muted">
              {t.subfolderVisibility(parentName)}
            </p>
          ) : (
            <Controller
              name="visibility"
              control={form.control}
              render={({ field }) => (
                <fieldset className="flex flex-col gap-3">
                  <legend className="mb-2 text-sm font-semibold">
                    {t.visibility}
                  </legend>
                  {VIDEO_FOLDER_VISIBILITIES.map((option) => (
                    <label
                      key={option}
                      className={cn(
                        "flex cursor-pointer flex-col gap-0.5 rounded-xl border-[1.5px] border-admin-field bg-card p-4 text-sm transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                        field.value === option
                          ? "border-action bg-wash"
                          : "hover:bg-admin-row-hover",
                      )}
                    >
                      <span className="flex items-center gap-3 text-[15px] font-bold">
                        <input
                          type="radio"
                          name={field.name}
                          value={option}
                          checked={field.value === option}
                          onChange={() => field.onChange(option)}
                          className="size-[22px] shrink-0 accent-(--primary)"
                        />
                        {VISIBILITY_COPY[option].label}
                      </span>
                      <span className="pl-[34px] text-[13px] text-admin-muted">
                        {VISIBILITY_COPY[option].description}
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}
            />
          )}
        </FieldGroup>

        {mode.kind === "create" ? (
          <p className="text-[13px] text-admin-muted">{t.emptyNote}</p>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="neutral"
            onClick={() => changeOpen(false)}
          >
            {t.cancel}
          </Button>
          <Button type="submit" variant="action" disabled={isPending}>
            {isPending ? t.saving : mode.kind === "edit" ? t.save : t.create}
          </Button>
        </div>
      </form>
    </ResponsiveDialog>
  );
}
