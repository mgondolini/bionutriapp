"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { ProfileSection } from "@/components/shared/profile-section";
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
import { copy } from "@/lib/copy/it";
import { useHydrated } from "@/lib/use-hydrated";
import { updateStaffProfileAction } from "@/server/actions/profile.actions";
import {
  staffProfileSchema,
  type StaffProfileFormValues,
} from "@/server/validation/profile.schema";

const t = copy.profile.personal;

type FieldName = keyof StaffProfileFormValues;

/** Titolo, nome e cognome del professionista, come compaiono nella sidebar. */
export function StaffProfileForm({
  initial,
}: {
  initial: { title: string | null; firstName: string; lastName: string | null };
}) {
  const hydrated = useHydrated();
  const ids = useId();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<StaffProfileFormValues>({
    resolver: zodResolver(staffProfileSchema, undefined, {
      raw: true,
    }) as unknown as Resolver<StaffProfileFormValues>,
    defaultValues: {
      title: initial.title ?? "",
      firstName: initial.firstName,
      lastName: initial.lastName ?? "",
    },
  });
  const [title, firstName, lastName] = useWatch({
    control: form.control,
    name: ["title", "firstName", "lastName"],
  });
  const preview = [title, firstName, lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await updateStaffProfileAction(values);
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setError(result.error);
        for (const [field, messages] of Object.entries(
          result.fieldErrors ?? {},
        )) {
          if (messages?.[0]) {
            form.setError(field as FieldName, { message: messages[0] });
          }
        }
        return;
      }
      toast.success(t.saved);
      form.reset(values);
    });
  });

  const fields: {
    name: FieldName;
    label: string;
    autoComplete: string;
    hint?: string;
  }[] = [
    {
      name: "title",
      label: t.titleLabel,
      autoComplete: "honorific-prefix",
      hint: t.titleHint,
    },
    { name: "firstName", label: t.firstName, autoComplete: "given-name" },
    { name: "lastName", label: t.lastName, autoComplete: "family-name" },
  ];

  return (
    <ProfileSection title={t.title}>
      <form
        method="post"
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        <FieldGroup>
          {error ? <FormMessage>{error}</FormMessage> : null}
          {fields.map(({ name, label, autoComplete, hint }) => {
            const inputId = `${ids}-${name}`;
            const hintId = `${inputId}-hint`;
            return (
              <Controller
                key={name}
                name={name}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
                    <Input
                      {...field}
                      id={inputId}
                      autoComplete={autoComplete}
                      disabled={isPending}
                      aria-invalid={fieldState.invalid}
                      aria-describedby={hint ? hintId : undefined}
                      className="max-w-md"
                    />
                    {hint ? (
                      <FieldDescription id={hintId}>{hint}</FieldDescription>
                    ) : null}
                    <FieldError errors={[fieldState.error]} />
                  </Field>
                )}
              />
            );
          })}
        </FieldGroup>
        {preview ? (
          <p className="text-sm text-muted-foreground">
            {t.displayNamePreview(preview)}
          </p>
        ) : null}
        <Button
          type="submit"
          className="self-start"
          disabled={!hydrated || isPending || !form.formState.isDirty}
        >
          {isPending ? t.saving : t.save}
        </Button>
      </form>
    </ProfileSection>
  );
}
