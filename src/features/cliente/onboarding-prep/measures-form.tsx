"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Info, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
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
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatDecimal, formatNumber } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { saveOnboardingMeasuresAction } from "@/server/actions/onboarding-prep.actions";
import type { PrepMeasureItem } from "@/server/services/onboarding-prep.service";
import {
  prepMeasuresFormSchema,
  type PrepMeasuresFormValues,
} from "@/server/validation/onboarding-prep.schema";

const t = copy.onboardingPrep.measuresPage;

function hintOf(item: PrepMeasureItem): string {
  return (
    t.hints[item.key] ??
    t.range(
      formatNumber(item.limits.minValue),
      formatNumber(item.limits.maxValue),
      item.unit ?? "",
    )
  );
}

/**
 * Misure di partenza (C29): tutte le misure mensili in una schermata, con
 * la data. Limiti e messaggi del Tracking (T-02, T-04): l'errore sta sotto
 * il campo e dice i valori ammessi. Si salvano tutte insieme.
 */
export function PrepMeasuresForm({
  items,
  today,
  defaultDate,
}: {
  items: PrepMeasureItem[];
  /** Oggi a Roma: data massima. */
  today: string;
  /** Data già inviata, altrimenti oggi. */
  defaultDate: string;
}) {
  const ids = useId();
  const hydrated = useHydrated();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();
  const schema = useMemo(
    () =>
      prepMeasuresFormSchema(
        items.map((item) => ({ key: item.key, limits: item.limits })),
      ),
    [items],
  );
  const sent = items.every((item) => item.value !== null);
  const form = useForm<PrepMeasuresFormValues>({
    // raw: alla Server Action vanno i valori digitati, che li rivalida
    resolver: zodResolver(schema, undefined, {
      raw: true,
    }) as unknown as Resolver<PrepMeasuresFormValues>,
    defaultValues: {
      recordedOn: defaultDate,
      values: Object.fromEntries(
        items.map((item) => [
          item.key,
          item.value === null ? "" : formatDecimal(item.value),
        ]),
      ),
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    setStatus("");
    startTransition(async () => {
      const result = await saveOnboardingMeasuresAction(values);
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setError(result.error);
        for (const [field, messages] of Object.entries(
          result.fieldErrors ?? {},
        )) {
          const name =
            field === "recordedOn"
              ? "recordedOn"
              : (`values.${field}` as const);
          form.setError(name, { message: messages?.[0] });
        }
        return;
      }
      setStatus(t.saved);
      toast.success(t.saved);
      router.push(ROUTES.client.prep);
    });
  });

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-3.5"
    >
      <p className="flex items-start gap-3 rounded-[14px] bg-info p-3.5 text-sm leading-5 text-info-foreground">
        <Info
          aria-hidden="true"
          strokeWidth={1.8}
          className="mt-0.5 size-4 shrink-0"
        />
        <span>{t.intro}</span>
      </p>
      <fieldset className="flex flex-col gap-4 rounded-[20px] border border-admin-line bg-card p-4">
        <legend className="sr-only">{t.group(items.length)}</legend>
        <h2 aria-hidden="true" className="text-[15px] font-bold">
          {t.group(items.length)}
        </h2>
        {items.map((item) => {
          const hintId = `${ids}-${item.key}-hint`;
          return (
            <Controller
              key={item.key}
              name={`values.${item.key}`}
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${ids}-${item.key}`}>
                    {item.name}
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      id={`${ids}-${item.key}`}
                      inputMode="decimal"
                      autoComplete="off"
                      disabled={isPending}
                      aria-invalid={fieldState.invalid}
                      aria-describedby={hintId}
                      className="pr-12 text-lg font-semibold md:text-lg"
                    />
                    {item.unit ? (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground"
                      >
                        {item.unit}
                      </span>
                    ) : null}
                  </div>
                  {fieldState.error ? (
                    <FieldError id={hintId} errors={[fieldState.error]} />
                  ) : (
                    <FieldDescription id={hintId}>
                      {hintOf(item)}
                    </FieldDescription>
                  )}
                </Field>
              )}
            />
          );
        })}
        <Controller
          name="recordedOn"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${ids}-date`}>{t.dateLabel}</FieldLabel>
              <Input
                {...field}
                id={`${ids}-date`}
                type="date"
                max={today}
                disabled={isPending}
                aria-invalid={fieldState.invalid}
                aria-describedby={`${ids}-date-hint`}
              />
              {fieldState.error ? (
                <FieldError
                  id={`${ids}-date-hint`}
                  errors={[fieldState.error]}
                />
              ) : (
                <FieldDescription id={`${ids}-date-hint`}>
                  {t.dateHint}
                </FieldDescription>
              )}
            </Field>
          )}
        />
        {error ? <FormMessage>{error}</FormMessage> : null}
        <Button
          size="lg"
          type="submit"
          className="w-full"
          disabled={!hydrated || isPending}
        >
          <Send aria-hidden="true" strokeWidth={1.8} />
          {sent ? t.submitAgain : t.submit}
        </Button>
      </fieldset>
      <p aria-live="polite" className="sr-only">
        {status}
      </p>
      <p className="text-[13px] leading-5 text-admin-muted">{t.footer}</p>
    </form>
  );
}
