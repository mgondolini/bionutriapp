"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy/it";
import { formatLongDate } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { updateClientAction } from "@/server/actions/clients.actions";
import type { ClientProfile } from "@/server/services/clients.service";
import {
  updateClientSchema,
  type UpdateClientFormValues,
} from "@/server/validation/clients.schema";

import { ProfileItem, ProfileSection } from "./profile-section";

const t = copy.admin.clients.profile.data;

type FieldName = Exclude<keyof UpdateClientFormValues, "clientId">;

const FIELDS: {
  name: FieldName;
  label: string;
  type?: string;
}[] = [
  { name: "firstName", label: t.firstName },
  { name: "lastName", label: t.lastName },
  { name: "phone", label: t.phone, type: "tel" },
  { name: "email", label: t.email, type: "email" },
  { name: "birthDate", label: t.birthDate, type: "date" },
];

function valuesOf(client: ClientProfile): UpdateClientFormValues {
  return {
    clientId: client.id,
    firstName: client.firstName,
    lastName: client.lastName ?? "",
    phone: client.phone,
    email: client.email ?? "",
    birthDate: client.birthDate ?? "",
  };
}

/** Dati anagrafici del cliente, in lettura o in modifica (A-06). */
export function ClientDataCard({ client }: { client: ClientProfile }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<UpdateClientFormValues>({
    resolver: zodResolver(updateClientSchema, undefined, {
      raw: true,
    }) as unknown as Resolver<UpdateClientFormValues>,
    defaultValues: valuesOf(client),
  });

  const cancel = () => {
    form.reset(valuesOf(client));
    setError(null);
    setEditing(false);
  };

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await updateClientAction(values);
      if (result.ok) {
        toast.success(t.saved);
        setEditing(false);
        return;
      }
      setError(result.error);
      for (const [field, messages] of Object.entries(
        result.fieldErrors ?? {},
      )) {
        if (messages?.[0])
          form.setError(field as FieldName, { message: messages[0] });
      }
    });
  });

  const missingOnActivation =
    client.origin === "new" && !client.hasAccount && !editing;

  return (
    <ProfileSection
      title={t.title}
      action={
        editing ? null : (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              form.reset(valuesOf(client));
              setEditing(true);
            }}
          >
            <Pencil aria-hidden="true" />
            {t.edit}
          </Button>
        )
      }
    >
      {editing ? (
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            {error ? <FormMessage>{error}</FormMessage> : null}
            <div className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map(({ name, label, type }) => (
                <Controller
                  key={name}
                  name={name}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={`client-${name}`}>
                        {label}
                      </FieldLabel>
                      <Input
                        {...field}
                        id={`client-${name}`}
                        type={type ?? "text"}
                        autoComplete="off"
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              ))}
            </div>
            {client.hasAccount ? (
              <FieldDescription>{t.authSyncHint}</FieldDescription>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" onClick={cancel}>
                {t.cancel}
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? t.saving : t.save}
              </Button>
            </div>
          </FieldGroup>
        </form>
      ) : (
        <>
          <dl className="grid gap-4 sm:grid-cols-2">
            <ProfileItem label={t.firstName}>{client.firstName}</ProfileItem>
            <ProfileItem label={t.lastName}>
              {client.lastName ?? t.empty}
            </ProfileItem>
            <ProfileItem label={t.phone}>
              {formatPhone(client.phone)}
            </ProfileItem>
            <ProfileItem label={t.email}>{client.email ?? t.empty}</ProfileItem>
            <ProfileItem label={t.birthDate}>
              {client.birthDate && client.age !== null
                ? t.age(formatLongDate(client.birthDate), client.age)
                : t.empty}
            </ProfileItem>
            <ProfileItem label={t.origin}>
              {t.origins[client.origin]}
            </ProfileItem>
          </dl>
          {missingOnActivation ? (
            <p className="text-sm text-muted-foreground">
              {t.completedOnActivation(client.firstName)}
            </p>
          ) : null}
        </>
      )}
    </ProfileSection>
  );
}
