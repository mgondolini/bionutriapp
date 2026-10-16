"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Controller, useForm, type Control } from "react-hook-form";

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
import { loginAction } from "@/server/actions/auth.actions";
import { loginSchema, type LoginInput } from "@/server/validation/auth.schema";

import { FormMessage } from "@/components/shared/form-message";

const t = copy.auth.login;

/**
 * Campo identificativo del login, isolato: nella fase 4 accetterà anche il
 * cellulare (cambieranno tipo, etichetta e validazione solo qui e nello schema).
 */
function IdentifierField({ control }: { control: Control<LoginInput> }) {
  return (
    <Controller
      name="identifier"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor="login-identifier">
            {t.identifierLabel}
          </FieldLabel>
          <Input
            {...field}
            id="login-identifier"
            type="text"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            autoComplete="username"
            placeholder={t.identifierPlaceholder}
            aria-invalid={fieldState.invalid}
          />
          <FieldError errors={[fieldState.error]} />
        </Field>
      )}
    />
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hydrated = useHydrated();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "", next },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      // In caso di successo la Server Action reindirizza all'area del ruolo.
      const result = await loginAction(values);
      if (result && !result.ok) setError(result.error);
    });
  });

  return (
    <form method="post" onSubmit={onSubmit} noValidate>
      <FieldGroup>
        {error ? <FormMessage>{error}</FormMessage> : null}
        <IdentifierField control={form.control} />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="login-password">
                {t.passwordLabel}
              </FieldLabel>
              <Input
                {...field}
                id="login-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Button
          type="submit"
          disabled={!hydrated || isPending}
          className="w-full"
        >
          {isPending ? t.submitting : t.submit}
        </Button>
        <Link
          href={ROUTES.recoverPassword}
          className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t.forgotPassword}
        </Link>
      </FieldGroup>
    </form>
  );
}
