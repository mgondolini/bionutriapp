"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { submitEntry } from "@/components/shared/tracking/entry-form-mode";
import { ScorePicker } from "@/components/shared/tracking/score-picker";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { copy } from "@/lib/copy/it";
import { scoreText } from "@/lib/domain/tracking/labels";
import type { HabitOverview } from "@/lib/domain/tracking/overview";
import { habitScale } from "@/lib/domain/tracking/score-scale";
import { formatLongDate } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import {
  habitEntryFormSchema,
  metricLimits,
  type HabitEntryFormValues,
} from "@/server/validation/tracking.schema";

const t = copy.tracking.add;
const f = copy.tracking.form;
const scale = copy.tracking.scale;

/**
 * Voto di un'abitudine inserito dal nutrizionista (A-15): giorno non futuro e
 * voto 1–5 con la descrizione ancorata all'obiettivo del cliente (T-07). Se il
 * giorno ha già un voto (un solo valore al giorno) il form lo dice e lo
 * sostituisce, invece di dare errore.
 */
export function HabitEntryForm({
  item,
  clientId,
  today,
  onDone,
}: {
  item: HabitOverview;
  clientId: string;
  today: string;
  onDone: () => void;
}) {
  const hydrated = useHydrated();
  const ids = useId();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const limits = metricLimits(item.metric);
  const rows = item.goal
    ? habitScale(item.metric.key, item.goal.value, item.goal.unit)
    : null;
  const form = useForm<HabitEntryFormValues>({
    resolver: zodResolver(habitEntryFormSchema(limits), undefined, {
      raw: true,
    }) as unknown as Resolver<HabitEntryFormValues>,
    defaultValues: { value: null, recordedOn: today },
  });
  const recordedOn = useWatch({ control: form.control, name: "recordedOn" });
  const value = useWatch({ control: form.control, name: "value" });
  const existing = item.entries.find(
    (entry) => entry.recordedOn === recordedOn,
  );
  const row = rows?.find((candidate) => candidate.score === value);

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = existing
        ? await submitEntry(
            { kind: "edit", entryId: existing.id, clientId },
            { value: values.value },
          )
        : await submitEntry(
            { kind: "create", metricId: item.metric.id, clientId },
            values,
          );
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(existing ? t.replaced : t.saved);
      onDone();
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
            <FieldLabel htmlFor={`${ids}-date`}>{f.date}</FieldLabel>
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
      {existing ? (
        <FormMessage tone="info">
          {t.existingDay(
            formatLongDate(existing.recordedOn),
            scoreText(existing.value, item.metric.maxValue),
          )}
        </FormMessage>
      ) : null}
      <Controller
        name="value"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <span id={`${ids}-question`} className="text-sm font-medium">
              {item.metric.instructions ?? item.metric.name}
            </span>
            <ScorePicker
              name={`${ids}-score`}
              min={limits.minValue}
              max={limits.maxValue}
              value={field.value}
              onChange={field.onChange}
              labelledBy={`${ids}-question`}
              describedBy={`${ids}-description`}
              disabled={isPending}
              invalid={fieldState.invalid}
            />
            <p
              id={`${ids}-description`}
              aria-live="polite"
              className="min-h-5 text-sm font-medium"
            >
              {row
                ? `${scale.scoreLabel(row.score, row.meaning)} · ${row.amount}`
                : null}
            </p>
            <FieldError errors={[fieldState.error]} />
          </Field>
        )}
      />
      {error ? <FormMessage>{error}</FormMessage> : null}
      <Button type="submit" disabled={!hydrated || isPending}>
        {existing ? t.replace : t.save}
      </Button>
    </form>
  );
}
