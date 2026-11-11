"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Upload } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { StudioLogo } from "@/components/shared/studio-logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { FormMessage } from "@/components/shared/form-message";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import {
  LOGO_SOURCE_MAX_BYTES,
  LOGO_SOURCE_MIME_TYPES,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { isLogoSourceLargeEnough } from "@/lib/logo/crop";
import { useHydrated } from "@/lib/use-hydrated";
import {
  LogoCropDialog,
  type LogoSource,
} from "@/features/admin/logo/logo-crop-dialog";
import { imageSize, loadImage } from "@/features/admin/logo/render-logo";
import { updateStudioSettingsAction } from "@/server/actions/studio.actions";
import {
  studioSettingsSchema,
  type StudioSettingsFormInput,
} from "@/server/validation/studio.schema";

const t = copy.admin.settings;

type StudioSettingsFormProps = {
  initial: { name: string; logoUrl: string | null };
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

export function StudioSettingsForm({ initial }: StudioSettingsFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hydrated = useHydrated();
  const form = useForm<StudioSettingsFormInput>({
    resolver: zodResolver(studioSettingsSchema),
    defaultValues: {
      name: initial.name,
      logo: undefined,
    },
  });

  const [name, logo] = useWatch({
    control: form.control,
    name: ["name", "logo"],
  });
  const logoUrl = useLogoPreview(logo, initial.logoUrl);
  const [cropSource, setCropSource] = useState<LogoSource | null>(null);

  function closeCrop() {
    if (cropSource) URL.revokeObjectURL(cropSource.url);
    setCropSource(null);
  }

  /** Controlla l'immagine scelta e apre il ritaglio (il file non parte così com'è). */
  async function chooseLogo(file: File) {
    const v = t.validation;
    const setLogoError = (message: string) =>
      form.setError("logo", { message });
    if (!(LOGO_SOURCE_MIME_TYPES as readonly string[]).includes(file.type)) {
      return setLogoError(v.logoSourceType);
    }
    if (file.size > LOGO_SOURCE_MAX_BYTES) {
      return setLogoError(v.logoSourceSize);
    }
    const url = URL.createObjectURL(file);
    try {
      const image = await loadImage(url);
      const size = imageSize(image);
      if (!isLogoSourceLargeEnough(size)) {
        URL.revokeObjectURL(url);
        return setLogoError(v.logoSourceSmall(size.width, size.height));
      }
      form.clearErrors("logo");
      setCropSource({ url, image });
    } catch {
      URL.revokeObjectURL(url);
      setLogoError(v.logoSourceType);
    }
  }

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    const formData = new FormData();
    formData.set("name", values.name);
    if (values.logo) formData.set("logo", values.logo);

    startTransition(async () => {
      const result = await updateStudioSettingsAction(formData);
      if (redirectIfSignedOut(result)) return;
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
    <div className="max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>
            <h2 className="text-lg font-semibold">{t.identityTitle}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form method="post" onSubmit={onSubmit} noValidate>
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
                        accept={LOGO_SOURCE_MIME_TYPES.join(",")}
                        aria-invalid={fieldState.invalid}
                        aria-describedby="studio-logo-file"
                        onBlur={field.onBlur}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          // stesso file scelto di nuovo: deve riaprire il ritaglio
                          event.target.value = "";
                          if (file) void chooseLogo(file);
                        }}
                        className="peer sr-only"
                      />
                      <label
                        htmlFor="studio-logo"
                        className={buttonVariants({
                          variant: "outline",
                          className:
                            "cursor-pointer peer-focus-visible:ring-3 peer-focus-visible:ring-ring/50",
                        })}
                      >
                        <Upload aria-hidden="true" className="size-4" />
                        {t.logoChange}
                      </label>
                      <span
                        id="studio-logo-file"
                        className="min-w-0 truncate text-sm text-muted-foreground"
                      >
                        {logo ? t.logoReady : t.logoNone}
                      </span>
                    </div>
                    <FieldDescription>{t.logoHint}</FieldDescription>
                    <FieldError errors={[fieldState.error]} />
                    <LogoCropDialog
                      key={cropSource?.url}
                      source={cropSource}
                      onCancel={closeCrop}
                      onConfirm={(file) => {
                        field.onChange(file);
                        form.clearErrors("logo");
                        closeCrop();
                      }}
                    />
                  </Field>
                )}
              />

              <Button
                type="submit"
                disabled={!hydrated || isPending}
                className="w-full sm:w-fit"
              >
                {isPending ? t.submitting : t.submit}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
