"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormMessage } from "@/components/shared/form-message";
import { PasswordInput } from "@/components/shared/password-input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { copy } from "@/lib/copy/it";
import { useHydrated } from "@/lib/use-hydrated";
import { resetPasswordViaInviteAction } from "@/server/actions/invites.actions";
import {
  resetViaInviteSchema,
  type ResetViaInviteInput,
} from "@/server/validation/invites.schema";

const t = copy.activation;

/** Nuovo link a un cliente già attivo (N-02): nuova password, poi accesso. */
export function ResetPasswordForm({ token }: { token: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hydrated = useHydrated();
  const form = useForm<ResetViaInviteInput>({
    resolver: zodResolver(resetViaInviteSchema),
    defaultValues: { token, password: "" },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await resetPasswordViaInviteAction(values);
      if (!result.ok) setError(result.error);
    });
  });

  return (
    <form method="post" onSubmit={onSubmit} noValidate>
      <FieldGroup>
        {error ? <FormMessage>{error}</FormMessage> : null}
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="reset-password">{t.password}</FieldLabel>
              <PasswordInput
                field={field}
                id="reset-password"
                invalid={fieldState.invalid}
                describedBy="reset-password-requirements"
              />
              <FieldDescription id="reset-password-requirements">
                {t.passwordRequirements}
              </FieldDescription>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Button
          type="submit"
          disabled={!hydrated || isPending}
          className="w-full"
        >
          {isPending ? t.submitting : t.resetSubmit}
        </Button>
      </FieldGroup>
    </form>
  );
}
