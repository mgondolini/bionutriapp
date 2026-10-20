"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState, useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { copy } from "@/lib/copy/it";
import { formatNumber } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import {
  circumferenceFormSchema,
  type CircumferenceFormValues,
  type MetricLimits,
} from "@/server/validation/tracking.schema";

import { submitEntry, type EntryFormMode } from "./entry-form-mode";

const t = copy.client.tracking.circumference;

type CircumferenceFormProps = {
  mode: EntryFormMode;
  limits: MetricLimits;
  /** Oggi a Roma: data proposta e massima. */
  today: string;
  defaultValues?: CircumferenceFormValues;
  /** Testo del pulsante (nuova misura o correzione). */
  submitLabel: string;
  successMessage: string;
  onDone?: () => void;
};

/**
 * Registrazione o correzione di una circonferenza (C10, T-02, T-04): valore
 * con la virgola o il punto, data non futura, limiti della misura mostrati e
 * validati qui e di nuovo nella Server Action; il database resta l'ultimo controllo.
 */
export function CircumferenceForm({
  mode,
  limits,
  today,
  defaultValues,
  submitLabel,
  successMessage,
  onDone,
}: CircumferenceFormProps) {
  const hydrated = useHydrated();
  const ids = useId();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const emptyValues = { value: "", recordedOn: today };
  const form = useForm<CircumferenceFormValues>({
    // raw: alla Server Action vanno i valori digitati, che li rivalida
    resolver: zodResolver(circumferenceFormSchema(limits), undefined, {
      raw: true,
    }) as unknown as Resolver<CircumferenceFormValues>,
    defaultValues: defaultValues ?? emptyValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await submitEntry(mode, values);
      if (!result.ok) {
        setError(result.error);
        for (const [field, messages] of Object.entries(
          result.fieldErrors ?? {},
        )) {
          if (field === "value" || field === "recordedOn") {
            form.setError(field, { message: messages?.[0] });
          }
        }
        return;
      }
      toast.success(successMessage);
      if (mode.kind === "create") form.reset(emptyValues);
      onDone?.();
    });
  });

  const hintId = `${ids}-hint`;
  return (
    <form
      method="post"
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <Controller
          name="value"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${ids}-value`}>{t.value}</FieldLabel>
              <div className="relative">
                <Input
                  {...field}
                  id={`${ids}-value`}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={t.valuePlaceholder}
                  disabled={isPending}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={hintId}
                  className="pr-12 text-lg font-semibold"
                />
                {limits.unit ? (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
                  >
                    {limits.unit}
                  </span>
                ) : null}
              </div>
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
        <Controller
          name="recordedOn"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${ids}-date`}>{t.date}</FieldLabel>
              <Input
                {...field}
                id={`${ids}-date`}
                type="date"
                max={today}
                disabled={isPending}
                aria-invalid={fieldState.invalid}
                aria-describedby={hintId}
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>
      <FieldDescription id={hintId}>
        {t.limits(
          formatNumber(limits.minValue),
          formatNumber(limits.maxValue),
          limits.unit ?? "",
        )}
      </FieldDescription>
      {error ? <FormMessage>{error}</FormMessage> : null}
      <Button type="submit" disabled={!hydrated || isPending}>
        {submitLabel}
      </Button>
    </form>
  );
}
