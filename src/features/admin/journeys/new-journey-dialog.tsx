"use client";

import { Info, Plus, RefreshCw } from "lucide-react";
import { useId, useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import {
  JOURNEY_CHECKS_BY_DURATION,
  JOURNEY_DURATIONS,
  JOURNEY_GIFT_MODES,
  type JourneyDuration,
  type JourneyGiftMode,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import {
  planJourney,
  suggestComposition,
} from "@/lib/domain/journeys/composition";
import { journeyEndDate } from "@/lib/domain/journeys/dates";
import { sessionLabel } from "@/lib/domain/journeys/labels";
import { sessionNames } from "@/lib/domain/journeys/sessions";
import { daysBetween } from "@/lib/domain/tracking/dates";
import { formatLongDate, formatShortDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";
import { createJourneyAction } from "@/server/actions/journeys.actions";

import { SegmentedControl } from "./segmented-control";

const t = copy.journeys.admin;
const d = t.dialog;

export type PreviousJourney = {
  id: string;
  durationMonths: JourneyDuration;
  concludedOn: string;
};

/**
 * Nuovo percorso (A18): da un percorso concluso ("Estendi o riprendi") o il
 * primo ("Imposta percorso"). Onboarding, check omaggio, durata, inizio,
 * anteprima delle date e riepilogo; conferma prima di creare. Con un
 * percorso precedente le impostazioni iniziali seguono i giorni dalla fine.
 */
export function NewJourneyDialog({
  clientId,
  clientName,
  previous,
  clientConcluded,
  today,
  threshold,
}: {
  clientId: string;
  clientName: string;
  previous: PreviousJourney | null;
  /** Il cliente è in fase Concluso: con il nuovo percorso torna In percorso. */
  clientConcluded: boolean;
  today: string;
  threshold: number;
}) {
  const ids = useId();
  const hydrated = useHydrated();
  const daysSince = previous ? daysBetween(previous.concludedOn, today) : 0;
  const suggestion = previous
    ? suggestComposition(daysSince, threshold, previous.durationMonths)
    : null;
  const initial = {
    includeOnboarding: suggestion?.includeOnboarding ?? true,
    giftMode: suggestion?.giftMode ?? ("none" as JourneyGiftMode),
    durationMonths: suggestion?.durationMonths ?? (6 as JourneyDuration),
    startDate: today,
  };

  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const validStart = /^\d{4}-\d{2}-\d{2}$/.test(values.startDate);
  const preview = validStart ? planJourney(values, values.startDate) : [];
  const names = sessionNames(
    preview.map((session) => ({ ...session, id: String(session.position) })),
    "staff",
  );
  const checks = JOURNEY_CHECKS_BY_DURATION[values.durationMonths];

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    setConfirming(false);
    setError(null);
    if (next) setValues(initial);
  };

  const update = (patch: Partial<typeof values>) => {
    setConfirming(false);
    setValues((current) => ({ ...current, ...patch }));
  };

  const create = () => {
    setError(null);
    startTransition(async () => {
      const result = await createJourneyAction({
        clientId,
        previousJourneyId: previous?.id ?? null,
        ...values,
      });
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      toast.success(d.created);
      setOpen(false);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button type="button" variant="action" />}>
        {previous ? (
          <RefreshCw aria-hidden="true" />
        ) : (
          <Plus aria-hidden="true" />
        )}
        {previous ? t.extend : t.empty.action}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{previous ? d.title : t.setupTitle}</DialogTitle>
          <DialogDescription>
            {previous ? d.description : t.setupDescription}
          </DialogDescription>
        </DialogHeader>

        {clientConcluded ? (
          <p className="flex gap-2.5 rounded-xl bg-info px-4 py-3 text-sm text-info-foreground">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {d.stageNotice(clientName)}
          </p>
        ) : null}

        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2 text-sm font-semibold">
            {d.compositionLabel}
          </legend>
          <label
            htmlFor={`${ids}-onboarding`}
            className="flex cursor-pointer items-start gap-3 rounded-xl bg-muted px-4 py-3.5"
          >
            <input
              id={`${ids}-onboarding`}
              type="checkbox"
              checked={values.includeOnboarding}
              onChange={(event) =>
                update({ includeOnboarding: event.target.checked })
              }
              className="mt-0.5 size-5 shrink-0 accent-foreground"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{d.onboarding}</span>
              <span className="text-[13px] text-admin-muted">
                {d.onboardingHint}
              </span>
            </span>
          </label>
        </fieldset>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="sr-only">{d.giftLabel}</legend>
          {JOURNEY_GIFT_MODES.map((mode) => (
            <label
              key={mode}
              htmlFor={`${ids}-gift-${mode}`}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border-[1.5px] bg-card px-4 py-3.5 has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                values.giftMode === mode
                  ? "border-foreground"
                  : "border-admin-line",
              )}
            >
              <input
                id={`${ids}-gift-${mode}`}
                type="radio"
                name={`${ids}-gift`}
                value={mode}
                checked={values.giftMode === mode}
                onChange={() => update({ giftMode: mode })}
                className="mt-0.5 size-5 shrink-0 accent-foreground"
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-semibold">{d.giftModes[mode].label}</span>
                <span className="text-[13px] text-admin-muted">
                  {d.giftModes[mode].hint}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="flex flex-wrap items-end gap-5">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">{t.durationLabel}</span>
            <SegmentedControl
              label={t.durationLabel}
              value={values.durationMonths}
              onChange={(durationMonths) => update({ durationMonths })}
              options={JOURNEY_DURATIONS.map((value) => ({
                value,
                label: copy.journeys.duration[value],
              }))}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor={`${ids}-start`} className="text-sm font-semibold">
              {t.startLabel}
            </label>
            <Input
              id={`${ids}-start`}
              type="date"
              value={values.startDate}
              onChange={(event) => update({ startDate: event.target.value })}
              className="w-44"
            />
          </div>
          {validStart ? (
            <p className="flex min-h-11 items-center text-sm">
              {d.endPreview}{" "}
              <b className="ml-1">
                {formatLongDate(
                  journeyEndDate(values.startDate, values.durationMonths),
                )}
              </b>
            </p>
          ) : null}
        </div>

        {preview.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">{d.previewTitle}</h3>
            <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {preview.map((session) => (
                <li
                  key={session.position}
                  className="flex flex-col rounded-lg bg-muted px-2.5 py-2 text-xs"
                >
                  <span className="font-bold">
                    {sessionLabel(names.get(String(session.position))!)}
                  </span>
                  <span>{formatShortDate(session.calculatedDate)}</span>
                </li>
              ))}
            </ol>
            <p className="text-[13px]">
              <b>{d.sessionsCount(preview.length)}</b>{" "}
              {d.summary(values.includeOnboarding, values.giftMode, checks)}{" "}
              {suggestion
                ? d.suggested(daysSince, threshold, suggestion.withinThreshold)
                : null}
            </p>
          </div>
        ) : null}

        {error ? <FormMessage>{error}</FormMessage> : null}

        <DialogFooter className="items-center">
          {confirming ? (
            <>
              <p role="status" className="mr-auto text-sm font-semibold">
                {d.confirm}
              </p>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={isPending}
              >
                {d.cancel}
              </Button>
              <Button
                type="button"
                variant="action"
                onClick={create}
                disabled={!hydrated || isPending}
              >
                {previous ? d.create : d.createFirst}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                {d.cancel}
              </Button>
              <Button
                type="button"
                variant="action"
                onClick={() => setConfirming(true)}
                disabled={!hydrated || !validStart}
              >
                {previous ? d.create : d.createFirst}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
