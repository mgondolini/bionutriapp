"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { CircumferenceForm } from "@/components/shared/tracking/circumference-form";
import { WorkoutForm } from "@/components/shared/tracking/workout-form";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy/it";
import type { MetricOverview } from "@/lib/domain/tracking/overview";
import { metricLimits } from "@/server/validation/tracking.schema";

import { HabitEntryForm } from "./habit-entry-form";

const t = copy.tracking.add;

/**
 * "Aggiungi registrazione" del nutrizionista (A-15), nelle card e nel
 * dettaglio della misura: stessi form e stessa validazione dell'area cliente.
 * Pannello dal basso su telefono, dialog su desktop (A-17). Per le
 * circonferenze la data proposta è oggi, il caso della misura presa in visita.
 */
export function AddEntryDialog({
  item,
  clientId,
  clientName,
  today,
  className,
}: {
  item: MetricOverview;
  clientId: string;
  clientName: string;
  today: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const limits = metricLimits(item.metric);
  const mode = { kind: "create", metricId: item.metric.id, clientId } as const;
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={setOpen}
      title={t.title(item.metric.name)}
      description={t.description(clientName)}
      trigger={
        <Button
          type="button"
          variant="outline"
          aria-label={t.ctaAria(item.metric.name)}
          className={className}
        >
          <Plus aria-hidden="true" />
          {t.cta}
        </Button>
      }
    >
      {item.kind === "circumference" ? (
        <CircumferenceForm
          mode={mode}
          limits={limits}
          today={today}
          submitLabel={t.save}
          successMessage={t.saved}
          onDone={close}
        />
      ) : item.kind === "workout" ? (
        <WorkoutForm
          mode={mode}
          limits={limits}
          question={item.metric.instructions ?? item.metric.name}
          today={today}
          submitLabel={t.save}
          successMessage={t.saved}
          onDone={close}
        />
      ) : (
        <HabitEntryForm
          item={item}
          clientId={clientId}
          today={today}
          onDone={close}
        />
      )}
    </ResponsiveDialog>
  );
}
