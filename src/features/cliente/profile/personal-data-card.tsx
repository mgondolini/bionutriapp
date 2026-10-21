"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState, useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import {
  ProfileItem,
  ProfileSection,
} from "@/components/shared/profile-section";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { copy } from "@/lib/copy/it";
import { formatLongDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { useHydrated } from "@/lib/use-hydrated";
import { updateClientProfileAction } from "@/server/actions/profile.actions";
import {
  clientProfileSchema,
  type ClientProfileFormValues,
} from "@/server/validation/profile.schema";

const t = copy.profile.personal;

type FieldName = keyof ClientProfileFormValues;

/**
 * Dati personali del cliente (C13, C-07): modifica di nome, cognome e data
 * di nascita. Il cellulare è in sola lettura: è l'identificativo di accesso e
 * il numero degli inviti WhatsApp, lo cambia solo lo studio (A-06).
 */
export function PersonalDataCard({
  firstName,
  lastName,
  birthDate,
  phone,
}: {
  firstName: string;
  lastName: string | null;
  birthDate: string | null;
  phone: string;
}) {
  const hydrated = useHydrated();
  const ids = useId();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const initial: ClientProfileFormValues = {
    firstName,
    lastName: lastName ?? "",
    birthDate: birthDate ?? "",
  };
  const form = useForm<ClientProfileFormValues>({
    resolver: zodResolver(clientProfileSchema, undefined, {
      raw: true,
    }) as unknown as Resolver<ClientProfileFormValues>,
    defaultValues: initial,
  });

  const startEditing = () => {
    form.reset(initial);
    setError(null);
    setEditing(true);
  };

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await updateClientProfileAction(values);
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
      setEditing(false);
    });
  });

  const fields: {
    name: FieldName;
    label: string;
    autoComplete: string;
    type?: string;
  }[] = [
    { name: "firstName", label: t.firstName, autoComplete: "given-name" },
    { name: "lastName", label: t.lastName, autoComplete: "family-name" },
    {
      name: "birthDate",
      label: t.birthDate,
      autoComplete: "bday",
      type: "date",
    },
  ];

  const phoneHintId = `${ids}-phone-hint`;
  return (
    <ProfileSection
      title={t.title}
      action={
        editing ? null : (
          <Button
            type="button"
            variant="outline"
            onClick={startEditing}
            aria-label={t.editAria}
          >
            {t.edit}
          </Button>
        )
      }
    >
      {editing ? (
        <form
          method="post"
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          <FieldGroup>
            {error ? <FormMessage>{error}</FormMessage> : null}
            {fields.map(({ name, label, autoComplete, type }) => {
              const inputId = `${ids}-${name}`;
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
                        type={type}
                        autoComplete={autoComplete}
                        disabled={isPending}
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              );
            })}
          </FieldGroup>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!hydrated || isPending}>
              {isPending ? t.saving : t.save}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={isPending}
            >
              {t.cancel}
            </Button>
          </div>
        </form>
      ) : (
        <dl className="grid gap-4">
          <ProfileItem label={t.name}>
            {[firstName, lastName].filter(Boolean).join(" ")}
          </ProfileItem>
          <ProfileItem label={t.birthDate}>
            {birthDate ? formatLongDate(birthDate) : t.noValue}
          </ProfileItem>
        </dl>
      )}
      <dl className="grid gap-4 border-t pt-4">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-medium text-muted-foreground">
            {t.phone}
          </dt>
          <dd className="text-sm" aria-describedby={phoneHintId}>
            {formatPhone(phone)}
          </dd>
          <dd id={phoneHintId} className="text-xs text-muted-foreground">
            {t.phoneHint}
          </dd>
        </div>
      </dl>
    </ProfileSection>
  );
}
