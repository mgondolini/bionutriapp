"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState, useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { TRACKING_NOTE_MAX } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { useHydrated } from "@/lib/use-hydrated";
import {
  workoutFormSchema,
  type MetricLimits,
  type WorkoutFormValues,
} from "@/server/validation/tracking.schema";

import { submitEntry, type EntryFormMode } from "./entry-form-mode";
import { ScorePicker } from "./score-picker";

const t = copy.client.tracking.workout;

type WorkoutFormProps = {
  mode: EntryFormMode;
  limits: MetricLimits;
  /** Domanda della misura ("Voto alla qualità/performance dell'allenamento"). */
  question: string;
  today: string;
  defaultValues?: WorkoutFormValues;
  submitLabel: string;
  successMessage: string;
  onDone?: () => void;
};

/** Registrazione o correzione di un allenamento (C11, T-02, T-09): voto da 1 a 10 e nota facoltativa. */
export function WorkoutForm({
  mode,
  limits,
  question,
  today,
  defaultValues,
  submitLabel,
  successMessage,
  onDone,
}: WorkoutFormProps) {
  const hydrated = useHydrated();
  const ids = useId();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const emptyValues: WorkoutFormValues = {
    value: null,
    recordedOn: today,
    note: "",
  };
  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutFormSchema(limits), undefined, {
      raw: true,
    }) as unknown as Resolver<WorkoutFormValues>,
    defaultValues: defaultValues ?? emptyValues,
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await submitEntry(mode, values);
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(successMessage);
      if (mode.kind === "create") form.reset(emptyValues);
      onDone?.();
    });
  });

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4"
    >
      <Controller
        name="recordedOn"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="max-w-48">
            <FieldLabel htmlFor={`${ids}-date`}>{t.date}</FieldLabel>
            <Input
              {...field}
              id={`${ids}-date`}
              type="date"
              max={today}
              disabled={isPending}
              aria-invalid={fieldState.invalid}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
      <Controller
        name="value"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <span id={`${ids}-question`} className="text-sm font-medium">
              {question}
            </span>
            <ScorePicker
              name={`${ids}-score`}
              min={limits.minValue}
              max={limits.maxValue}
              value={field.value}
              onChange={field.onChange}
              labelledBy={`${ids}-question`}
              disabled={isPending}
              invalid={fieldState.invalid}
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
      <Controller
        name="note"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={`${ids}-note`}>
              {t.note}
              <span className="font-normal text-muted-foreground">
                {t.noteOptional}
              </span>
            </FieldLabel>
            <textarea
              {...field}
              id={`${ids}-note`}
              rows={2}
              maxLength={TRACKING_NOTE_MAX}
              placeholder={t.notePlaceholder}
              disabled={isPending}
              aria-invalid={fieldState.invalid}
              className="min-h-16 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm"
            />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
      {error ? <FormMessage>{error}</FormMessage> : null}
      <Button type="submit" disabled={!hydrated || isPending}>
        {submitLabel}
      </Button>
    </form>
  );
}
