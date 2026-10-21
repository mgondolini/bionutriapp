"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { PasswordInput } from "@/components/shared/password-input";
import { ProfileSection } from "@/components/shared/profile-section";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { copy } from "@/lib/copy/it";
import { useHydrated } from "@/lib/use-hydrated";
import { changePasswordAction } from "@/server/actions/profile.actions";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/server/validation/profile.schema";

const t = copy.profile.password;

type FieldName = keyof ChangePasswordInput;

const EMPTY: ChangePasswordInput = {
  currentPassword: "",
  password: "",
  confirm: "",
};

/**
 * Cambio password (C-07, cliente e professionista): password attuale, nuova
 * e conferma. Il server verifica l'attuale con un nuovo login e chiude le
 * altre sessioni; questa resta aperta.
 */
export function PasswordCard() {
  const hydrated = useHydrated();
  const ids = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY,
  });

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    setError(null);
    form.reset(EMPTY);
  };

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await changePasswordAction(values);
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
      onOpenChange(false);
    });
  });

  const fields: {
    name: FieldName;
    label: string;
    autoComplete: "current-password" | "new-password";
    hint?: string;
  }[] = [
    {
      name: "currentPassword",
      label: t.currentLabel,
      autoComplete: "current-password",
    },
    {
      name: "password",
      label: t.newLabel,
      autoComplete: "new-password",
      hint: t.requirements,
    },
    { name: "confirm", label: t.confirmLabel, autoComplete: "new-password" },
  ];

  return (
    <ProfileSection
      title={t.title}
      description={t.description}
      action={
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogTrigger render={<Button type="button" variant="outline" />}>
            <KeyRound aria-hidden="true" />
            {t.open}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.dialogTitle}</DialogTitle>
              <DialogDescription>{t.dialogDescription}</DialogDescription>
            </DialogHeader>
            <form
              method="post"
              onSubmit={onSubmit}
              noValidate
              className="flex flex-col gap-5"
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
                          <PasswordInput
                            field={field}
                            id={inputId}
                            invalid={fieldState.invalid}
                            describedBy={hint ? hintId : undefined}
                            autoComplete={autoComplete}
                            placeholder=""
                            disabled={isPending}
                          />
                          {hint ? (
                            <FieldDescription id={hintId}>
                              {hint}
                            </FieldDescription>
                          ) : null}
                          <FieldError errors={[fieldState.error]} />
                        </Field>
                      )}
                    />
                  );
                })}
              </FieldGroup>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {t.cancel}
                </Button>
                <Button type="submit" disabled={!hydrated || isPending}>
                  {isPending ? t.submitting : t.submit}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
    />
  );
}
