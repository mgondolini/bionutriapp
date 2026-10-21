"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";

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
import { useHydrated } from "@/lib/use-hydrated";
import { requestEmailChangeAction } from "@/server/actions/profile.actions";
import {
  emailChangeSchema,
  type EmailChangeFormValues,
} from "@/server/validation/profile.schema";
import type { AccountEmail } from "@/server/services/profile.service";

const t = copy.profile.email;

/**
 * Email dell'account (C-07): cambio o aggiunta con conferma al nuovo
 * indirizzo (cambio sicuro di Supabase). L'email resta quella attuale finché
 * il link non viene aperto.
 */
export function EmailCard({
  email,
  hint,
}: {
  email: AccountEmail;
  /** Spiegazione sotto il titolo: per il cliente il recupero password (N-02). */
  hint: string;
}) {
  const hydrated = useHydrated();
  const inputId = useId();
  const [editing, setEditing] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<EmailChangeFormValues>({
    resolver: zodResolver(emailChangeSchema) as Resolver<EmailChangeFormValues>,
    defaultValues: { email: "" },
  });

  const close = () => {
    setEditing(false);
    setError(null);
    form.reset({ email: "" });
  };

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await requestEmailChangeAction(values);
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        const fieldError = result.fieldErrors?.email?.[0];
        if (fieldError) form.setError("email", { message: fieldError });
        else setError(result.error);
        return;
      }
      setSent(
        result.data.confirmBoth
          ? t.sentToBoth(result.data.email)
          : t.sentToNew(result.data.email),
      );
      close();
    });
  });

  const hasEmail = email.current !== null;
  return (
    <ProfileSection
      title={t.title}
      description={hint}
      action={
        editing ? null : (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSent(null);
              setEditing(true);
            }}
          >
            {hasEmail ? t.change : t.add}
          </Button>
        )
      }
    >
      <dl className="grid gap-4">
        <ProfileItem label={t.current}>{email.current ?? t.none}</ProfileItem>
      </dl>
      {sent ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg bg-info px-3 py-2 text-sm text-info-foreground"
        >
          <MailCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {sent}
        </p>
      ) : email.pending ? (
        <FormMessage tone="info">{t.pending(email.pending)}</FormMessage>
      ) : null}
      {editing ? (
        <form
          method="post"
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          <FieldGroup>
            {error ? <FormMessage>{error}</FormMessage> : null}
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={inputId}>
                    {hasEmail ? t.newLabel : t.addLabel}
                  </FieldLabel>
                  <Input
                    {...field}
                    id={inputId}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoFocus
                    disabled={isPending}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
          </FieldGroup>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!hydrated || isPending}>
              {isPending ? t.submitting : t.submit}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={close}
              disabled={isPending}
            >
              {t.cancel}
            </Button>
          </div>
        </form>
      ) : null}
    </ProfileSection>
  );
}
