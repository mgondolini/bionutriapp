"use client";

import { Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { MetricIcon } from "@/components/shared/metric-icon";
import { Button } from "@/components/ui/button";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatGoalAmount } from "@/lib/domain/tracking/score-scale";
import { useHydrated } from "@/lib/use-hydrated";
import { saveCheckinAction } from "@/server/actions/tracking.actions";
import type { Checkin, CheckinHabit } from "@/server/services/tracking.service";
import { checkinSchema } from "@/server/validation/tracking.schema";

import { ScorePicker } from "./score-picker";

const t = copy.client.tracking.checkin;
const scale = copy.tracking.scale;

type CheckinFormValues = { values: Record<string, number | null> };

/** "4 · Quasi raggiunto · circa 6.000 passi" */
function scoreDescription(habit: CheckinHabit, score: number | null) {
  if (score === null) return t.notChosen;
  const row = habit.scale?.find((item) => item.score === score);
  return row
    ? `${scale.scoreLabel(score, row.meaning)} · ${row.amount}`
    : String(score);
}

/**
 * Check-in giornaliero (C9, T-06): passi, sonno e acqua con un tocco
 * ciascuno; le descrizioni dei voti seguono l'obiettivo del cliente (T-07).
 * Si salvano insieme, con una sola Server Action e una sola operazione nel
 * database; i voti non scelti restano come sono.
 */
export function CheckinForm({ checkin }: { checkin: Checkin }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const ids = useId();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<CheckinFormValues>({
    defaultValues: {
      values: Object.fromEntries(
        checkin.habits.map((habit) => [habit.key, habit.value]),
      ),
    },
  });
  const alreadyFilled = checkin.habits.some((habit) => habit.value !== null);

  const onSubmit = form.handleSubmit(({ values }) => {
    setError(null);
    const chosen = Object.fromEntries(
      Object.entries(values).filter(
        (entry): entry is [string, number] => entry[1] !== null,
      ),
    );
    const parsed = checkinSchema.safeParse({
      day: checkin.day,
      values: chosen,
    });
    if (!parsed.success) {
      setError(copy.tracking.validation.checkinEmpty);
      return;
    }
    startTransition(async () => {
      const result = await saveCheckinAction(parsed.data);
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(t.saved);
      router.push(ROUTES.client.tracking);
    });
  });

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4"
    >
      {alreadyFilled ? (
        <FormMessage tone="info">{t.alreadyFilled}</FormMessage>
      ) : null}
      {checkin.habits.map((habit) => {
        const questionId = `${ids}-${habit.key}-question`;
        const descriptionId = `${ids}-${habit.key}-description`;
        return (
          <Controller
            key={habit.key}
            name={`values.${habit.key}`}
            control={form.control}
            render={({ field }) => (
              <fieldset className="flex flex-col gap-3 rounded-xl border bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MetricIcon name={habit.icon} />
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <legend className="font-semibold">{habit.name}</legend>
                    <p
                      id={questionId}
                      className="text-sm text-muted-foreground"
                    >
                      {habit.instructions ?? habit.name}
                    </p>
                  </div>
                </div>
                <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Target aria-hidden="true" className="size-3.5" />
                  {habit.goal
                    ? t.goal(
                        formatGoalAmount(habit.goal.value, habit.goal.unit),
                      )
                    : t.noGoal}
                </p>
                <ScorePicker
                  name={`${ids}-${habit.key}`}
                  min={habit.minValue}
                  max={habit.maxValue}
                  value={field.value ?? null}
                  onChange={field.onChange}
                  labelledBy={questionId}
                  describedBy={descriptionId}
                  disabled={isPending}
                />
                <p
                  id={descriptionId}
                  aria-live="polite"
                  className="min-h-5 text-sm font-medium"
                >
                  {scoreDescription(habit, field.value ?? null)}
                </p>
              </fieldset>
            )}
          />
        );
      })}

      {error ? <FormMessage>{error}</FormMessage> : null}
      <Button type="submit" disabled={!hydrated || isPending}>
        {isPending ? t.saving : t.save}
      </Button>
      <p className="text-center text-xs text-muted-foreground">{t.skipHint}</p>
    </form>
  );
}
