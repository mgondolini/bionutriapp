"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";

import { FormMessage } from "@/components/shared/form-message";
import { PasswordInput } from "@/components/shared/password-input";
import { PrivacyNoticeContent } from "@/components/shared/privacy-notice";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy/it";
import { useHydrated } from "@/lib/use-hydrated";
import { activateAccountAction } from "@/server/actions/invites.actions";
import {
  activationSchema,
  type ActivationFormValues,
} from "@/server/validation/invites.schema";

const t = copy.activation;

type TextField = "firstName" | "lastName" | "email" | "birthDate" | "heightCm";

const DATA_FIELDS: {
  name: TextField;
  label: string;
  type?: string;
  autoComplete: string;
  inputMode?: "numeric";
  placeholder?: string;
  hint?: string;
}[] = [
  { name: "firstName", label: t.firstName, autoComplete: "given-name" },
  {
    name: "lastName",
    label: t.lastName,
    autoComplete: "family-name",
    placeholder: t.lastNamePlaceholder,
  },
  {
    name: "email",
    label: t.email,
    type: "email",
    autoComplete: "email",
    placeholder: t.emailPlaceholder,
    hint: t.emailHint,
  },
  { name: "birthDate", label: t.birthDate, type: "date", autoComplete: "bday" },
  {
    name: "heightCm",
    label: t.height,
    autoComplete: "off",
    inputMode: "numeric",
    placeholder: copy.common.height.placeholder,
    hint: t.heightHint,
  },
];

/** Presa visione dell'informativa e consenso ai dati sanitari, separati (NF-06). */
const CONSENTS: { name: "privacyNotice" | "healthData"; label: string }[] = [
  { name: "privacyNotice", label: t.privacyNotice },
  { name: "healthData", label: t.healthData },
];

/**
 * Attivazione (C-08): un solo form per i due percorsi. Cliente già nel
 * database (C1) = dati precompilati da verificare; nuovo cliente (C2) = dati
 * da completare. In entrambi i casi password e consensi. Lo schema Zod è lo
 * stesso della Server Action, che rivalida tutto.
 */
export function ActivationForm({
  token,
  studioName,
  initial,
}: {
  token: string;
  /** Titolare del trattamento nell'informativa. */
  studioName: string;
  initial: {
    firstName: string;
    lastName: string | null;
    email: string | null;
    birthDate: string | null;
    heightCm: number | null;
  };
}) {
  const [error, setError] = useState<string | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const hydrated = useHydrated();
  const form = useForm<ActivationFormValues>({
    resolver: zodResolver(activationSchema, undefined, {
      raw: true,
    }) as unknown as Resolver<ActivationFormValues>,
    defaultValues: {
      token,
      firstName: initial.firstName,
      lastName: initial.lastName ?? "",
      email: initial.email ?? "",
      birthDate: initial.birthDate ?? "",
      heightCm: initial.heightCm === null ? "" : String(initial.heightCm),
      password: "",
      privacyNotice: false,
      healthData: false,
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      // in caso di successo la Server Action reindirizza a /app
      const result = await activateAccountAction(values);
      if (result.ok) return;
      setError(result.error);
      for (const [field, messages] of Object.entries(
        result.fieldErrors ?? {},
      )) {
        if (messages?.[0])
          form.setError(field as keyof ActivationFormValues, {
            message: messages[0],
          });
      }
    });
  });

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-6"
    >
      {error ? <FormMessage>{error}</FormMessage> : null}

      <FieldSet>
        <FieldLegend>{t.dataTitle}</FieldLegend>
        <FieldGroup>
          {DATA_FIELDS.map(
            ({
              name,
              label,
              type,
              autoComplete,
              inputMode,
              placeholder,
              hint,
            }) => (
              <Controller
                key={name}
                name={name}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={`activation-${name}`}>
                      {label}
                    </FieldLabel>
                    <Input
                      {...field}
                      id={`activation-${name}`}
                      type={type ?? "text"}
                      autoComplete={autoComplete}
                      inputMode={inputMode}
                      placeholder={placeholder}
                      aria-invalid={fieldState.invalid}
                    />
                    {hint ? <FieldDescription>{hint}</FieldDescription> : null}
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            ),
          )}
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>{t.passwordTitle}</FieldLegend>
        <FieldGroup>
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="activation-password">
                  {t.password}
                </FieldLabel>
                <PasswordInput
                  field={field}
                  id="activation-password"
                  invalid={fieldState.invalid}
                  describedBy="activation-password-requirements"
                />
                <FieldDescription id="activation-password-requirements">
                  {t.passwordRequirements}
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </FieldGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>{t.consentTitle}</FieldLegend>
        <ResponsiveDialog
          open={privacyOpen}
          onOpenChange={setPrivacyOpen}
          title={t.privacyDialogTitle}
          dialogClassName="sm:max-w-2xl"
          trigger={
            <Button
              type="button"
              variant="link"
              className="h-11 self-start px-0 underline"
            >
              {t.privacyNoticeLink}
            </Button>
          }
        >
          <div className="flex flex-col gap-6">
            <PrivacyNoticeContent studioName={studioName} />
            {/* Spunta solo la presa visione: il consenso ai dati sulla salute resta una scelta separata (art. 9 GDPR). */}
            <Button
              type="button"
              size="lg"
              className="sticky bottom-0 w-full"
              onClick={() => {
                form.setValue("privacyNotice", true, { shouldValidate: true });
                setPrivacyOpen(false);
              }}
            >
              {t.privacyAccept}
            </Button>
          </div>
        </ResponsiveDialog>
        <FieldGroup className="gap-3">
          {CONSENTS.map(({ name, label }) => (
            <Controller
              key={name}
              name={name}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <label className="flex min-h-11 items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      name={field.name}
                      ref={field.ref}
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                      className="mt-0.5 size-[22px] shrink-0 accent-(--primary)"
                    />
                    <span>{label}</span>
                  </label>
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          ))}
        </FieldGroup>
      </FieldSet>

      <Button
        size="lg"
        type="submit"
        disabled={!hydrated || isPending}
        className="w-full"
      >
        {isPending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
