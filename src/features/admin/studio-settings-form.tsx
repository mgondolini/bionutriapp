"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FileText, Upload } from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { StudioLogo } from "@/components/shared/studio-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/shared/form-message";
import { formatRatio, isHexColor, pickForeground } from "@/lib/color";
import { DEFAULT_PRIMARY_COLOR, LOGO_MIME_TYPES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { updateStudioSettingsAction } from "@/server/actions/studio.actions";
import {
  studioSettingsSchema,
  type StudioSettingsFormInput,
} from "@/server/validation/studio.schema";

const t = copy.admin.settings;

type StudioSettingsFormProps = {
  initial: { name: string; primaryColor: string; logoUrl: string | null };
};

/** Anteprima del logo scelto (URL temporaneo del file) o di quello attuale. */
function useLogoPreview(file: File | undefined, currentUrl: string | null) {
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );
  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);
  return previewUrl ?? currentUrl;
}

/** Anteprima dell'app del cliente con nome, logo e colore scelti (A12). */
function ClientPreview({
  name,
  logoUrl,
  color,
}: {
  name: string;
  logoUrl: string | null;
  color: string;
}) {
  const foreground = pickForeground(color).color;
  const style = {
    "--primary": color,
    "--primary-foreground": foreground,
  } as CSSProperties;
  return (
    <div
      style={style}
      className="overflow-hidden rounded-2xl border bg-background"
    >
      <div className="flex items-center gap-3 bg-card px-4 py-3">
        <StudioLogo name={name} logoUrl={logoUrl} size="sm" />
        <div className="min-w-0">
          <p className="truncate text-xs text-muted-foreground">{name}</p>
          <p className="font-semibold">{t.previewGreeting}</p>
        </div>
      </div>
      <div className="p-4">
        <div className="flex flex-col gap-3 rounded-xl bg-card p-4">
          <div className="flex items-center gap-2 text-xs">
            <span className="rounded-full bg-primary px-2 py-0.5 font-medium text-primary-foreground">
              {t.previewBadge}
            </span>
            <span className="text-muted-foreground">
              {copy.domain.fileCategory.diet}
            </span>
          </div>
          <p className="font-semibold">{t.previewFileTitle}</p>
          <span className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground">
            <FileText aria-hidden="true" className="size-4" />
            {t.previewButton}
          </span>
        </div>
      </div>
    </div>
  );
}

export function StudioSettingsForm({ initial }: StudioSettingsFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<StudioSettingsFormInput>({
    resolver: zodResolver(studioSettingsSchema),
    defaultValues: {
      name: initial.name,
      primaryColor: initial.primaryColor,
      logo: undefined,
    },
  });

  const [name, primaryColor, logo] = useWatch({
    control: form.control,
    name: ["name", "primaryColor", "logo"],
  });
  const previewColor = isHexColor(primaryColor ?? "")
    ? primaryColor
    : DEFAULT_PRIMARY_COLOR;
  const contrast = useMemo(() => pickForeground(previewColor), [previewColor]);
  const logoUrl = useLogoPreview(logo, initial.logoUrl);

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("primaryColor", values.primaryColor);
    if (values.logo) formData.set("logo", values.logo);

    startTransition(async () => {
      const result = await updateStudioSettingsAction(formData);
      if (result.ok) {
        toast.success(t.saved);
        form.reset({ ...values, logo: undefined });
        return;
      }
      setError(result.error);
      for (const [field, messages] of Object.entries(
        result.fieldErrors ?? {},
      )) {
        if (messages?.[0]) {
          form.setError(field as keyof StudioSettingsFormInput, {
            message: messages[0],
          });
        }
      }
    });
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-lg font-semibold">{t.identityTitle}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              {error ? <FormMessage>{error}</FormMessage> : null}

              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="studio-name">{t.nameLabel}</FieldLabel>
                    <Input
                      {...field}
                      id="studio-name"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>{t.nameHint}</FieldDescription>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                name="logo"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="studio-logo">{t.logoLabel}</FieldLabel>
                    <div className="flex flex-wrap items-center gap-4">
                      <StudioLogo
                        name={name || initial.name}
                        logoUrl={logoUrl}
                        size="lg"
                      />
                      {/* Input nativo nascosto: pulsante e nome del file in italiano (NF-10) */}
                      <input
                        id="studio-logo"
                        type="file"
                        accept={LOGO_MIME_TYPES.join(",")}
                        aria-invalid={fieldState.invalid}
                        aria-describedby="studio-logo-file"
                        onBlur={field.onBlur}
                        onChange={(event) =>
                          field.onChange(event.target.files?.[0])
                        }
                        className="peer sr-only"
                      />
                      <label
                        htmlFor="studio-logo"
                        className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border bg-card px-4 text-sm font-medium peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50 hover:bg-muted"
                      >
                        <Upload aria-hidden="true" className="size-4" />
                        {t.logoChange}
                      </label>
                      <span
                        id="studio-logo-file"
                        className="min-w-0 truncate text-sm text-muted-foreground"
                      >
                        {logo?.name ?? t.logoNone}
                      </span>
                    </div>
                    <FieldDescription>{t.logoHint}</FieldDescription>
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Controller
                name="primaryColor"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="studio-color">
                      {t.colorLabel}
                    </FieldLabel>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={previewColor}
                        onChange={(event) =>
                          field.onChange(event.target.value.toUpperCase())
                        }
                        aria-label={t.colorLabel}
                        className="size-11 shrink-0 cursor-pointer rounded-lg border bg-card p-1"
                      />
                      <Input
                        {...field}
                        id="studio-color"
                        maxLength={7}
                        spellCheck={false}
                        aria-invalid={fieldState.invalid}
                        className="max-w-36 font-mono uppercase"
                      />
                    </div>
                    <FieldDescription>
                      {t.contrast(
                        formatRatio(contrast.ratio),
                        contrast.tone === "light" ? t.textWhite : t.textDark,
                      )}
                    </FieldDescription>
                    {contrast.meetsAA ? null : (
                      <FormMessage>{t.contrastLow}</FormMessage>
                    )}
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />

              <Button
                type="submit"
                disabled={isPending}
                className="w-full sm:w-fit"
              >
                {isPending ? t.submitting : t.submit}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-lg font-semibold">{t.previewTitle}</h2>
          </CardTitle>
          <CardDescription>{t.previewDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <ClientPreview
            name={name || initial.name}
            logoUrl={logoUrl}
            color={previewColor}
          />
        </CardContent>
      </Card>
    </div>
  );
}
