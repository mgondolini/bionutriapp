"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil, RotateCcw } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
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
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { HABIT_GOAL_LIMITS, type HabitKey } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatGoalAmount } from "@/lib/domain/tracking/score-scale";
import { formatNumber } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import {
  resetGoalAction,
  saveGoalsAction,
} from "@/server/actions/tracking.actions";
import type { StaffGoal } from "@/server/services/tracking.service";
import {
  goalsFormSchema,
  type GoalsFormValues,
} from "@/server/validation/tracking.schema";

const t = copy.admin.clients.tracking.goals;

/** Valore nel campo: "2,5", "8000", "7". */
function inputValue(value: number): string {
  return String(value).replace(".", ",");
}

function valuesOf(goals: StaffGoal[]): GoalsFormValues {
  return Object.fromEntries(
    goals.map(({ key, goal }) => [key, inputValue(goal.value)]),
  );
}

/**
 * Obiettivi personali di passi, sonno e acqua (T-07, schermata A9): accanto
 * a ogni campo il predefinito dello studio; "Ripristina predefinito" elimina
 * l'obiettivo personale. Le descrizioni dei voti del cliente cambiano subito.
 */
export function GoalsDialog({
  clientId,
  clientName,
  goals,
}: {
  clientId: string;
  clientName: string;
  goals: StaffGoal[];
}) {
  const hydrated = useHydrated();
  const ids = useId();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<GoalsFormValues>({
    resolver: zodResolver(goalsFormSchema, undefined, {
      raw: true,
    }) as unknown as Resolver<GoalsFormValues>,
    defaultValues: valuesOf(goals),
  });

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    setError(null);
    if (next) form.reset(valuesOf(goals));
  };

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await saveGoalsAction({ clientId, goals: values });
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setError(result.error);
        for (const [field, messages] of Object.entries(
          result.fieldErrors ?? {},
        )) {
          form.setError(field as HabitKey, { message: messages?.[0] });
        }
        return;
      }
      toast.success(t.saved);
      setOpen(false);
    });
  });

  const reset = (key: HabitKey, studioDefault: number) => {
    setError(null);
    startTransition(async () => {
      const result = await resetGoalAction({ clientId, key });
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.setValue(key, inputValue(studioDefault));
      form.clearErrors(key);
      toast.success(t.resetDone);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button type="button" variant="outline" />}>
        <Pencil aria-hidden="true" />
        {t.edit}
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
          <FieldGroup>
            {goals.map(({ key, metricName, goal }) => {
              const limits = HABIT_GOAL_LIMITS[key];
              const inputId = `${ids}-${key}`;
              const hintId = `${inputId}-hint`;
              return (
                <Controller
                  key={key}
                  name={key}
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={inputId}>{t.labels[key]}</FieldLabel>
                      <div className="flex gap-2">
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          id={inputId}
                          inputMode={key === "steps" ? "numeric" : "decimal"}
                          autoComplete="off"
                          disabled={isPending}
                          aria-invalid={fieldState.invalid}
                          aria-describedby={hintId}
                          className="max-w-40"
                        />
                        {goal.personal ? (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => reset(key, goal.studioDefault)}
                            disabled={isPending}
                            aria-label={t.resetAria(metricName)}
                          >
                            <RotateCcw aria-hidden="true" />
                            {t.reset}
                          </Button>
                        ) : null}
                      </div>
                      <FieldDescription id={hintId}>
                        {t.hint(
                          formatGoalAmount(goal.studioDefault, goal.unit),
                          formatNumber(limits.min),
                          formatNumber(limits.max),
                        )}
                      </FieldDescription>
                      <FieldError errors={[fieldState.error]} />
                    </Field>
                  )}
                />
              );
            })}
          </FieldGroup>
          {error ? <FormMessage>{error}</FormMessage> : null}
          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
