"use client";

import { Pencil } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { MEASURE_DECIMALS, type MetricKind } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { formatDecimal } from "@/lib/format";
import { updateEntryAction } from "@/server/actions/tracking.actions";
import type { MetricLimits } from "@/server/validation/tracking.schema";

import { CircumferenceForm } from "./circumference-form";
import { ScorePicker } from "./score-picker";
import { WorkoutForm } from "./workout-form";

const t = copy.tracking.edit;

export type EditableEntry = {
  id: string;
  value: number;
  recordedOn: string;
  note: string | null;
};

/** Correzione del voto di un'abitudine: il giorno resta quello (un valore al giorno). */
function HabitScoreForm({
  entry,
  clientId,
  limits,
  onDone,
}: {
  entry: EditableEntry;
  clientId?: string;
  limits: MetricLimits;
  onDone: () => void;
}) {
  const labelId = useId();
  const [value, setValue] = useState(entry.value);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const save = () => {
    setError(null);
    startTransition(async () => {
      const result = await updateEntryAction({
        clientId,
        entryId: entry.id,
        values: { value },
      });
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(t.saved);
      onDone();
    });
  };
  return (
    <div className="flex flex-col gap-4">
      <span id={labelId} className="sr-only">
        {t.title}
      </span>
      <ScorePicker
        name={`${labelId}-score`}
        min={limits.minValue}
        max={limits.maxValue}
        value={value}
        onChange={setValue}
        labelledBy={labelId}
        disabled={isPending}
      />
      {error ? <FormMessage>{error}</FormMessage> : null}
      <Button type="button" onClick={save} disabled={isPending}>
        {t.save}
      </Button>
    </div>
  );
}

/**
 * Correzione di una registrazione (T-03, A-15) con lo stesso form della
 * registrazione, nelle due aree; `clientId` solo per lo staff.
 */
export function EditEntryDialog({
  kind,
  entry,
  clientId,
  limits,
  today,
  question,
  dateLabel,
}: {
  kind: MetricKind;
  entry: EditableEntry;
  clientId?: string;
  limits: MetricLimits;
  today: string;
  question: string;
  /** "8 settembre 2026" */
  dateLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const mode = { kind: "edit", entryId: entry.id, clientId } as const;
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      title={t.title}
      description={dateLabel}
      trigger={
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t.editAria(dateLabel)}
        >
          <Pencil aria-hidden="true" />
        </Button>
      }
    >
      {kind === "circumference" ? (
        <CircumferenceForm
          mode={mode}
          limits={limits}
          today={today}
          defaultValues={{
            value: formatDecimal(entry.value, MEASURE_DECIMALS),
            recordedOn: entry.recordedOn,
          }}
          submitLabel={t.save}
          successMessage={t.saved}
          onDone={close}
        />
      ) : kind === "workout" ? (
        <WorkoutForm
          mode={mode}
          limits={limits}
          question={question}
          today={today}
          defaultValues={{
            value: entry.value,
            recordedOn: entry.recordedOn,
            note: entry.note ?? "",
          }}
          submitLabel={t.save}
          successMessage={t.saved}
          onDone={close}
        />
      ) : (
        <HabitScoreForm
          entry={entry}
          clientId={clientId}
          limits={limits}
          onDone={close}
        />
      )}
    </ResponsiveDialog>
  );
}
