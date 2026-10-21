"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";

import { FormMessage } from "@/components/shared/form-message";
import { PasswordInput } from "@/components/shared/password-input";
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

type TextField = "firstName" | "lastName" | "email" | "birthDate";

const DATA_FIELDS: {
  name: TextField;
  label: string;
  type?: string;
  autoComplete: string;
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
];

/**
 * Attivazione (C-08): un solo form per i due percorsi. Cliente già nel
 * database (C1) = dati precompilati da verificare; nuovo cliente (C2) = dati
 * da completare. In entrambi i casi password e consenso. Lo schema Zod è lo
 * stesso della Server Action, che rivalida tutto.
 */
export function ActivationForm({
  token,
  initial,
}: {
  token: string;
  initial: {
    firstName: string;
    lastName: string | null;
    email: string | null;
    birthDate: string | null;
  };
}) {
  const [error, setError] = useState<string | null>(null);
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
      password: "",
      consent: false,
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
            ({ name, label, type, autoComplete, placeholder, hint }) => (
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
          <Controller
            name="consent"
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
                    className="mt-0.5 size-5 shrink-0 accent-(--primary)"
                  />
                  <span>{t.consent}</span>
                </label>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </FieldGroup>
      </FieldSet>

      <Button
        type="submit"
        disabled={!hydrated || isPending}
        className="w-full"
      >
        {isPending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
