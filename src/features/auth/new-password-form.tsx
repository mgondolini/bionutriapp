"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { useHydrated } from "@/lib/use-hydrated";
import { setNewPasswordAction } from "@/server/actions/auth.actions";
import {
  newPasswordSchema,
  type NewPasswordInput,
} from "@/server/validation/auth.schema";

import { FormMessage } from "@/components/shared/form-message";

const t = copy.auth.newPassword;

const linkClassName =
  "inline-flex min-h-11 items-center justify-center text-sm font-medium text-primary underline-offset-4 hover:underline";

/**
 * Nuova password dal link di recupero: il token viene verificato solo
 * all'invio, così l'apertura anticipata del link da parte dei client di posta
 * non lo consuma.
 */
export function NewPasswordForm({ tokenHash }: { tokenHash: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hydrated = useHydrated();
  const form = useForm<NewPasswordInput>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: {
      password: "",
      confirm: "",
      tokenHash: tokenHash ?? undefined,
    },
  });

  if (!tokenHash) {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage tone="info">{t.missingLink}</FormMessage>
        <Link href={ROUTES.recoverPassword} className={linkClassName}>
          {t.requestNewLink}
        </Link>
      </div>
    );
  }

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      // In caso di successo la Server Action reindirizza all'area del ruolo.
      const result = await setNewPasswordAction(values);
      if (result && !result.ok) setError(result.error);
    });
  });

  return (
    <form method="post" onSubmit={onSubmit} noValidate>
      <FieldGroup>
        {error ? <FormMessage>{error}</FormMessage> : null}
        {(["password", "confirm"] as const).map((name) => (
          <Controller
            key={name}
            name={name}
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`new-password-${name}`}>
                  {name === "password" ? t.passwordLabel : t.confirmLabel}
                </FieldLabel>
                <Input
                  {...field}
                  id={`new-password-${name}`}
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        ))}
        <Button
          type="submit"
          disabled={!hydrated || isPending}
          className="w-full"
        >
          {isPending ? t.submitting : t.submit}
        </Button>
        {error ? (
          <Link href={ROUTES.recoverPassword} className={linkClassName}>
            {t.requestNewLink}
          </Link>
        ) : null}
      </FieldGroup>
    </form>
  );
}
