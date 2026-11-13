"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import {
  JOURNEY_DURATIONS,
  type JourneyDuration,
  type JourneyGiftMode,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { journeyEndDate } from "@/lib/domain/journeys/dates";
import { planRecalc } from "@/lib/domain/journeys/sessions";
import { formatLongDate } from "@/lib/format";
import { useHydrated } from "@/lib/use-hydrated";
import { updateJourneyAction } from "@/server/actions/journeys.actions";
import type { StaffJourneyView } from "@/server/services/journeys.service";

import { SegmentedControl } from "./segmented-control";

const t = copy.journeys;

/**
 * "Durata del percorso" (A17): 6 mesi o 1 anno, data di inizio e fine
 * calcolata. Prima di salvare mostra quante sessioni si ricalcolano e quante
 * restano ferme (date modificate a mano).
 */
export function DurationCard({ journey }: { journey: StaffJourneyView }) {
  const ids = useId();
  const hydrated = useHydrated();
  const [duration, setDuration] = useState<JourneyDuration>(
    journey.durationMonths,
  );
  const [start, setStart] = useState(journey.startDate);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const validStart = /^\d{4}-\d{2}-\d{2}$/.test(start);
  const changed =
    duration !== journey.durationMonths || start !== journey.startDate;
  const plan =
    changed && validStart
      ? planRecalc(
          journey.sessions,
          {
            durationMonths: duration,
            includeOnboarding: journey.includeOnboarding,
            giftMode: journey.giftMode as JourneyGiftMode,
          },
          start,
        )
      : null;

  const reset = () => {
    setDuration(journey.durationMonths);
    setStart(journey.startDate);
    setError(null);
  };

  const apply = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateJourneyAction({
        journeyId: journey.id,
        durationMonths: duration,
        startDate: start,
      });
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(t.admin.durationSaved);
    });
  };

  return (
    <section
      aria-labelledby={`${ids}-title`}
      className="flex flex-col gap-5 rounded-[20px] border border-admin-line bg-card p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 id={`${ids}-title`} className="text-[17px] font-bold">
            {t.admin.durationTitle}
          </h2>
          <p className="text-sm text-admin-muted">
            {t.admin.durationDescription}
          </p>
        </div>
        {journey.kind === "first" ? (
          <span className="inline-flex min-h-7 items-center rounded-full bg-muted px-3 text-xs font-semibold text-secondary-foreground">
            {t.completedOf(journey.completed, journey.sessions.length)}
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end gap-5">
        <div className="flex flex-col gap-2">
          <span id={`${ids}-duration`} className="text-sm font-semibold">
            {t.admin.durationLabel}
          </span>
          <SegmentedControl
            label={t.admin.durationLabel}
            value={duration}
            onChange={setDuration}
            disabled={isPending}
            options={JOURNEY_DURATIONS.map((value) => ({
              value,
              label: t.duration[value],
            }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${ids}-start`} className="text-sm font-semibold">
            {t.admin.startLabel}
          </label>
          <Input
            id={`${ids}-start`}
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            disabled={isPending}
            className="w-44"
          />
        </div>
        <div className="flex flex-col gap-2">
          <span id={`${ids}-end`} className="text-sm font-semibold">
            {t.admin.endLabel}{" "}
            <span className="font-normal text-admin-muted">
              {t.admin.endCalculated}
            </span>
          </span>
          <p
            aria-labelledby={`${ids}-end`}
            className="flex min-h-11 w-52 items-center rounded-xl bg-muted px-4 text-sm"
          >
            {validStart
              ? formatLongDate(journeyEndDate(start, duration))
              : formatLongDate(journey.endDate)}
          </p>
        </div>
        <p className="basis-full text-[13px] text-admin-muted">
          {t.admin.durationHint}
        </p>
      </div>

      {plan ? (
        <div className="flex flex-col gap-3 rounded-xl bg-info px-4 py-3 text-sm text-info-foreground">
          <p role="status">
            {plan.blocked
              ? t.admin.recalcBlocked
              : [
                  t.admin.recalcSummary(
                    plan.recalculated.length,
                    plan.fixed.length,
                  ),
                  plan.inserts.length > 0
                    ? t.admin.recalcAdded(plan.inserts.length)
                    : null,
                  plan.deletes.length > 0
                    ? t.admin.recalcRemoved(plan.deletes.length)
                    : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="action"
              onClick={apply}
              disabled={!hydrated || isPending || plan.blocked}
            >
              {t.admin.applyDuration}
            </Button>
            <Button
              type="button"
              variant="neutral"
              onClick={reset}
              disabled={isPending}
            >
              {t.admin.dialog.cancel}
            </Button>
          </div>
        </div>
      ) : null}
      {error ? <FormMessage>{error}</FormMessage> : null}
    </section>
  );
}
