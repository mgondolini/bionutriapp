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
import { requestPasswordResetAction } from "@/server/actions/auth.actions";
import {
  recoverPasswordSchema,
  type RecoverPasswordInput,
} from "@/server/validation/auth.schema";

import { FormMessage } from "@/components/shared/form-message";

const t = copy.auth.recover;

export function RecoverPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hydrated = useHydrated();
  const form = useForm<RecoverPasswordInput>({
    resolver: zodResolver(recoverPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await requestPasswordResetAction(values);
      if (result.ok) setSent(true);
      else setError(result.error);
    });
  });

  return (
    <div className="flex flex-col gap-4">
      {sent ? (
        <FormMessage tone="info">{t.sent}</FormMessage>
      ) : (
        <form method="post" onSubmit={onSubmit} noValidate>
          <FieldGroup>
            {error ? <FormMessage>{error}</FormMessage> : null}
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="recover-email">
                    {t.emailLabel}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="recover-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
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
          </FieldGroup>
        </form>
      )}
      <div className="rounded-lg bg-muted px-4 py-3 text-sm">
        <p className="font-medium">{t.noEmailTitle}</p>
        <p className="text-muted-foreground">{t.noEmail}</p>
      </div>
      <Link
        href={ROUTES.login}
        className="inline-flex min-h-11 items-center justify-center text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        {t.backToLogin}
      </Link>
    </div>
  );
}
