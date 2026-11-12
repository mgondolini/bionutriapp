"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BellOff, BellRing, CalendarPlus, RotateCcw } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import {
  JOURNEY_NOTE_MAX,
  JOURNEY_SESSION_STATUSES,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { sessionLabel } from "@/lib/domain/journeys/labels";
import { formatLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";
import {
  restoreSessionDateAction,
  updateSessionAction,
} from "@/server/actions/journeys.actions";
import type { StaffSessionView } from "@/server/services/journeys.service";
import {
  sessionFormSchema,
  type SessionFormValues,
} from "@/server/validation/journeys.schema";

import { SegmentedControl } from "./segmented-control";

const t = copy.journeys;

function valuesOf(session: StaffSessionView): SessionFormValues {
  return {
    date: session.date,
    time: session.time ?? "",
    status: session.status,
    note: session.note ?? "",
  };
}

/**
 * Dettaglio della sessione selezionata (A17, A19): data e ora, data
 * calcolata dall'app con "Ripristina", stato, nota per lo staff. Salvando,
 * un cambio di data o ora arriva al cliente con una push.
 */
export function SessionDetail({
  session,
  pushEnabled,
}: {
  session: StaffSessionView;
  pushEnabled: boolean;
}) {
  const ids = useId();
  const hydrated = useHydrated();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<SessionFormValues>({
    resolver: zodResolver(sessionFormSchema, undefined, {
      raw: true,
    }) as unknown as Resolver<SessionFormValues>,
    defaultValues: valuesOf(session),
  });
  const name = sessionLabel(session.name);

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await updateSessionAction({
        sessionId: session.id,
        ...values,
      });
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setError(result.error);
        for (const [field, messages] of Object.entries(
          result.fieldErrors ?? {},
        )) {
          form.setError(field as keyof SessionFormValues, {
            message: messages?.[0],
          });
        }
        return;
      }
      toast.success(t.admin.saved);
    });
  });

  const restore = () => {
    setError(null);
    startTransition(async () => {
      const result = await restoreSessionDateAction({ sessionId: session.id });
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.setValue("date", session.calculatedDate);
      toast.success(t.admin.restored);
    });
  };

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      noValidate
      aria-labelledby={`${ids}-title`}
      className="grid gap-6 rounded-2xl bg-muted p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,1fr)]"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 id={`${ids}-title`} className="text-xl font-bold">
            {name}
          </h3>
          <span className="rounded-full bg-card px-2.5 py-0.5 text-xs font-semibold">
            {t.state[session.state]}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <Controller
            name="date"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="w-44">
                <FieldLabel htmlFor={`${ids}-date`}>
                  {t.admin.sessionDate}
                </FieldLabel>
                <Input
                  {...field}
                  id={`${ids}-date`}
                  type="date"
                  disabled={isPending}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={`${ids}-calculated`}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          <Controller
            name="time"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className="w-32">
                <FieldLabel htmlFor={`${ids}-time`}>
                  {t.admin.sessionTime}{" "}
                  <span className="font-normal text-admin-muted">
                    {t.admin.timeOptional}
                  </span>
                </FieldLabel>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  id={`${ids}-time`}
                  type="time"
                  disabled={isPending}
                  aria-invalid={fieldState.invalid}
                />
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
        </div>
        <p id={`${ids}-calculated`} className="text-[13px] text-admin-muted">
          {t.admin.calculatedOn(formatLongDate(session.calculatedDate))}
        </p>
        {session.modified ? (
          <Button
            type="button"
            variant="neutral"
            className="w-fit"
            onClick={restore}
            disabled={!hydrated || isPending}
          >
            <RotateCcw aria-hidden="true" />
            {t.admin.restore}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-4">
        <Controller
          name="status"
          control={form.control}
          render={({ field }) => (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-semibold">
                {t.admin.statusLabel}
              </span>
              <SegmentedControl
                label={t.admin.statusLabel}
                value={field.value}
                onChange={field.onChange}
                disabled={isPending}
                options={JOURNEY_SESSION_STATUSES.map((value) => ({
                  value,
                  label: t.status[value],
                }))}
              />
            </div>
          )}
        />
        <Controller
          name="note"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`${ids}-note`}>
                {t.admin.noteLabel}{" "}
                <span className="font-normal text-admin-muted">
                  {t.admin.noteOptional}
                </span>
              </FieldLabel>
              <textarea
                {...field}
                value={field.value ?? ""}
                id={`${ids}-note`}
                rows={3}
                maxLength={JOURNEY_NOTE_MAX}
                placeholder={t.admin.notePlaceholder}
                disabled={isPending}
                aria-invalid={fieldState.invalid}
                className="w-full rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-mint disabled:opacity-70 aria-invalid:border-warning-foreground md:text-sm"
              />
              <FieldError errors={[fieldState.error]} />
            </Field>
          )}
        />
      </div>

      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          variant="action"
          disabled={!hydrated || isPending}
        >
          {t.admin.save}
        </Button>
        <Button
          type="button"
          variant="neutral"
          disabled
          aria-describedby={`${ids}-calendar`}
        >
          <CalendarPlus aria-hidden="true" />
          {t.admin.calendar}
        </Button>
        <p id={`${ids}-calendar`} className="text-xs text-admin-muted">
          {t.admin.calendarSoon}
        </p>
        <p className="text-[13px] text-admin-muted">{t.admin.notifyNote}</p>
        <span
          className={cn(
            "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold text-foreground",
            pushEnabled ? "bg-mint" : "bg-warm",
          )}
        >
          {pushEnabled ? (
            <BellRing aria-hidden="true" className="size-3.5" />
          ) : (
            <BellOff aria-hidden="true" className="size-3.5" />
          )}
          {pushEnabled ? t.admin.pushActive : t.admin.pushInactive}
        </span>
        {error ? <FormMessage>{error}</FormMessage> : null}
      </div>
    </form>
  );
}
