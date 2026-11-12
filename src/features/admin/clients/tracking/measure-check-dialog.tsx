"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarClock, RotateCcw } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
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
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { MEASURE_CHECK_MAX_DAYS_AHEAD } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { addDays } from "@/lib/domain/tracking/dates";
import type { MeasureCheck } from "@/lib/domain/tracking/measure-check";
import { formatDayMonthShort, formatLongDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";
import { setMeasureCheckAction } from "@/server/actions/tracking.actions";
import {
  measureCheckFormSchema,
  type MeasureCheckFormValues,
} from "@/server/validation/tracking.schema";

const t = copy.admin.clients.tracking.check;

/**
 * Prossimo check di peso e circonferenze accanto al titolo della sezione
 * (scheda Tracking): una sola data per cliente, predefinita a ultima
 * registrazione + 30 giorni. Il nutrizionista la sposta o torna a quella
 * standard; al cliente arriva un promemoria alle 6 del giorno prima e del
 * giorno stesso.
 */
export function MeasureCheckDialog({
  clientId,
  clientName,
  check,
  today,
}: {
  clientId: string;
  clientName: string;
  check: MeasureCheck;
  today: string;
}) {
  const hydrated = useHydrated();
  const ids = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const initialDay = (): MeasureCheckFormValues => ({
    day: check.dueOn && check.dueOn >= today ? check.dueOn : today,
  });
  const form = useForm<MeasureCheckFormValues>({
    resolver: zodResolver(measureCheckFormSchema),
    defaultValues: initialDay(),
  });

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    setError(null);
    if (next) form.reset(initialDay());
  };

  const save = (day: string | null) => {
    setError(null);
    startTransition(async () => {
      const result = await setMeasureCheckAction({ clientId, day });
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        const dayError = result.fieldErrors?.day?.[0];
        if (dayError) form.setError("day", { message: dayError });
        else setError(result.error);
        return;
      }
      toast.success(day ? t.saved : t.resetDone);
      setOpen(false);
    });
  };

  const onSubmit = form.handleSubmit(({ day }) => save(day));
  const label = check.dueOn
    ? (check.source === "staff" ? t.pillStaff : t.pill)(
        formatDayMonthShort(check.dueOn),
      )
    : t.none;
  const overdue = check.dueOn !== null && check.dueOn < today;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex min-h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold whitespace-nowrap focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              overdue
                ? "bg-warning text-warning-foreground"
                : "bg-muted text-secondary-foreground hover:bg-admin-hover",
            )}
          />
        }
      >
        <CalendarClock aria-hidden="true" className="size-3.5" />
        {label}
        <span className="sr-only">{t.editAria(clientName)}</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.dialogTitle}</DialogTitle>
          <DialogDescription>
            {t.dialogDescription(clientName)}
          </DialogDescription>
        </DialogHeader>
        <form
          method="post"
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-5"
        >
          <Controller
            name="day"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${ids}-day`}>{t.label}</FieldLabel>
                <Input
                  {...field}
                  id={`${ids}-day`}
                  type="date"
                  min={today}
                  max={addDays(today, MEASURE_CHECK_MAX_DAYS_AHEAD)}
                  disabled={isPending}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={`${ids}-hint`}
                  className="max-w-52"
                />
                <FieldDescription id={`${ids}-hint`}>
                  {t.hint(
                    check.defaultDueOn
                      ? formatLongDate(check.defaultDueOn)
                      : null,
                  )}
                </FieldDescription>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />
          {error ? <FormMessage>{error}</FormMessage> : null}
          <DialogFooter className="sm:justify-between">
            {check.source === "staff" ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => save(null)}
                disabled={!hydrated || isPending}
              >
                <RotateCcw aria-hidden="true" />
                {t.reset}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                {t.cancel}
              </Button>
              <Button type="submit" disabled={!hydrated || isPending}>
                {t.save}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
