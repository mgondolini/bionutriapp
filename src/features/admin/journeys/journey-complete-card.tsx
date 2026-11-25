"use client";

import { Flag, PartyPopper } from "lucide-react";
import { useState, useTransition } from "react";
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
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import type { JourneyDuration } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { changeStageAction } from "@/server/actions/clients.actions";

import { NewJourneyDialog } from "./new-journey-dialog";

const t = copy.journeys.admin.complete;

/**
 * Percorso attivo con tutte le sessioni completate o saltate: "Estendi" apre
 * il nuovo percorso (estensione, il percorso attuale si conclude alla
 * creazione) e "Concludi percorso" porta il cliente a Concluso, che chiude il
 * percorso attivo.
 */
export function JourneyCompleteCard({
  clientId,
  clientName,
  journey,
  today,
  threshold,
}: {
  clientId: string;
  clientName: string;
  journey: { id: string; durationMonths: JourneyDuration };
  today: string;
  threshold: number;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const conclude = () => {
    setError(null);
    startTransition(async () => {
      const result = await changeStageAction({
        clientId,
        from: "in_progress",
        to: "completed",
      });
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(t.concluded);
      setOpen(false);
    });
  };

  return (
    <section
      aria-labelledby="journey-complete"
      className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border-2 border-mint bg-card p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mint text-mint-foreground">
          <PartyPopper aria-hidden="true" className="size-5" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 id="journey-complete" className="text-[17px] font-bold">
            {t.title}
          </h2>
          <p className="text-sm text-admin-muted">{t.description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2.5">
        <NewJourneyDialog
          clientId={clientId}
          clientName={clientName}
          previous={{
            id: journey.id,
            durationMonths: journey.durationMonths,
            concludedOn: today,
          }}
          clientConcluded={false}
          today={today}
          threshold={threshold}
          triggerLabel={t.extend}
        />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button type="button" variant="neutral" />}>
            <Flag aria-hidden="true" />
            {t.conclude}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t.confirmTitle}</DialogTitle>
              <DialogDescription>
                {t.confirmDescription(clientName)}
              </DialogDescription>
            </DialogHeader>
            {error ? <FormMessage>{error}</FormMessage> : null}
            <DialogFooter>
              <Button
                type="button"
                variant="neutral"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                {t.cancel}
              </Button>
              <Button
                type="button"
                variant="action"
                onClick={conclude}
                disabled={isPending}
              >
                {t.confirm}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
