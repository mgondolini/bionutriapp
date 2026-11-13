"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BellOff, Camera, Check, Lock, Ruler } from "lucide-react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import {
  ProfileItem,
  ProfileSection,
} from "@/components/shared/profile-section";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { clientDetailPath } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { measureText } from "@/lib/domain/tracking/labels";
import { dayInRome, formatDayMonthShort, formatTimeInRome } from "@/lib/format";
import { callWhenText } from "@/lib/onboarding-prep/labels";
import { cn } from "@/lib/utils";
import { useHydrated } from "@/lib/use-hydrated";
import { setOnboardingCallAction } from "@/server/actions/onboarding-prep.actions";
import type { PrepView } from "@/server/services/onboarding-prep.service";
import {
  callFormSchema,
  type CallFormValues,
} from "@/server/validation/onboarding-prep.schema";

const t = copy.onboardingPrep.admin;

function shortDay(timestamp: string) {
  return `${formatDayMonthShort(dayInRome(timestamp))}, ${formatTimeInRome(timestamp)}`;
}

/** Data e ora della chiamata: la sessione di onboarding del percorso. */
function CallDialog({
  clientId,
  call,
  open,
  onOpenChange,
}: {
  clientId: string;
  call: NonNullable<PrepView["call"]>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const ids = useId();
  const hydrated = useHydrated();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<CallFormValues>({
    resolver: zodResolver(callFormSchema, undefined, {
      raw: true,
    }) as unknown as Resolver<CallFormValues>,
    defaultValues: { date: call.date, time: call.time ?? "" },
  });
  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      const result = await setOnboardingCallAction({ clientId, ...values });
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(t.saved);
      onOpenChange(false);
    });
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          method="post"
          onSubmit={onSubmit}
          noValidate
          className="grid gap-4"
        >
          <DialogHeader>
            <DialogTitle>{t.editTitle}</DialogTitle>
            <DialogDescription>{t.editDescription}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,9rem)] gap-3">
            <Controller
              name="date"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${ids}-date`}>{t.dateLabel}</FieldLabel>
                  <Input
                    {...field}
                    id={`${ids}-date`}
                    type="date"
                    disabled={isPending}
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldError errors={[fieldState.error]} />
                </Field>
              )}
            />
            <Controller
              name="time"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`${ids}-time`}>
                    {t.timeLabel}{" "}
                    <span className="font-normal text-admin-muted">
                      {t.timeOptional}
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
          {error ? <FormMessage>{error}</FormMessage> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="neutral"
              onClick={() => onOpenChange(false)}
            >
              {t.cancel}
            </Button>
            <Button
              type="submit"
              variant="action"
              disabled={!hydrated || isPending}
            >
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TaskLine({
  icon: Icon,
  done,
  children,
}: {
  icon: typeof Ruler;
  done: boolean;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-full",
          done ? "bg-wash" : "bg-warm",
        )}
      >
        {done ? (
          <Check strokeWidth={1.8} className="size-3.5" />
        ) : (
          <Icon strokeWidth={1.8} className="size-3.5" />
        )}
      </span>
      {children}
    </span>
  );
}

/**
 * "Preparazione della chiamata" nella scheda Profilo di un cliente in
 * Onboarding (A5): data e ora della chiamata (modificabili), stato di misure
 * e foto, misure ricevute e collegamenti a Foto e Tracking.
 */
export function PrepCard({ prep }: { prep: PrepView }) {
  const [editing, setEditing] = useState(false);
  const { status, measures, photos } = prep;
  const badge = status.complete ? (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-mint px-2.5 py-0.5 text-[12px] font-semibold">
      <Check aria-hidden="true" strokeWidth={1.8} className="size-3.5" />
      {t.ready}
    </span>
  ) : (
    <span className="rounded-full bg-warm px-2.5 py-0.5 text-[12px] font-semibold">
      {t.missing(status.missing.map((task) => t.missingWhat[task]).join(", "))}
    </span>
  );
  return (
    <ProfileSection title={t.title} action={badge}>
      <dl className="grid gap-3.5">
        <ProfileItem label={t.callLabel}>
          {prep.call ? (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {callWhenText(prep.call.date, prep.call.time)}
              <Button
                type="button"
                variant="link"
                className="h-auto min-h-11 px-0"
                onClick={() => setEditing(true)}
              >
                {t.edit}
              </Button>
            </span>
          ) : (
            <span className="flex flex-col gap-1">
              <span className="font-normal text-admin-muted">
                {t.noJourney}
              </span>
              <Link
                href={clientDetailPath(prep.clientId, "percorso")}
                className="w-fit font-semibold text-primary-ink underline underline-offset-4"
              >
                {t.goToJourney}
              </Link>
            </span>
          )}
        </ProfileItem>
        <ProfileItem label={t.measuresLabel}>
          <TaskLine icon={Ruler} done={status.measures === "done"}>
            {t.measuresValue(
              measures.done,
              measures.total,
              measures.sentAt ? shortDay(measures.sentAt) : null,
            )}
          </TaskLine>
        </ProfileItem>
        <ProfileItem label={t.photosLabel}>
          <TaskLine icon={Camera} done={status.photos === "saved"}>
            <span className="inline-flex items-center gap-1.5">
              {t.photosValue(
                photos.count,
                photos.savedAt ? shortDay(photos.savedAt) : null,
              )}
              {status.photos === "saved" ? (
                <Lock
                  aria-hidden="true"
                  strokeWidth={1.8}
                  className="size-3.5"
                />
              ) : null}
            </span>
          </TaskLine>
        </ProfileItem>
      </dl>
      {measures.done > 0 ? (
        <dl className="grid gap-x-6 gap-y-2 rounded-[14px] bg-admin-hover px-4 py-3 text-sm sm:grid-cols-2">
          {measures.items.map((item) => (
            <div key={item.key} className="flex justify-between gap-3">
              <dt className="text-admin-muted">{item.name}</dt>
              <dd className="font-semibold tabular-nums">
                {item.value === null
                  ? t.noValue
                  : measureText(item.value, item.unit)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {!prep.pushEnabled && !status.complete ? (
        <p className="flex items-start gap-2 rounded-[14px] bg-warning px-3.5 py-3 text-sm text-warning-foreground">
          <BellOff
            aria-hidden="true"
            strokeWidth={1.8}
            className="mt-0.5 size-4 shrink-0"
          />
          {t.pushOff}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Link
          href={clientDetailPath(prep.clientId, "foto")}
          className={buttonVariants({ variant: "neutral" })}
        >
          <Camera aria-hidden="true" strokeWidth={1.8} />
          {t.openPhotos}
        </Link>
        <Link
          href={clientDetailPath(prep.clientId, "tracking")}
          className={buttonVariants({ variant: "neutral" })}
        >
          <Ruler aria-hidden="true" strokeWidth={1.8} />
          {t.openTracking}
        </Link>
      </div>
      {prep.call ? (
        <CallDialog
          key={`${prep.call.date}-${prep.call.time}`}
          clientId={prep.clientId}
          call={prep.call}
          open={editing}
          onOpenChange={setEditing}
        />
      ) : null}
    </ProfileSection>
  );
}
