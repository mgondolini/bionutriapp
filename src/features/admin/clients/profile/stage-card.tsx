"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { INITIAL_STAGE_BY_ORIGIN } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { availableActions } from "@/lib/domain/journey";
import { formatLongDate } from "@/lib/format";
import { changeStageAction } from "@/server/actions/clients.actions";
import type { ClientProfile } from "@/server/services/clients.service";

import { ProfileSection } from "@/components/shared/profile-section";

const t = copy.admin.clients.profile.stage;
const stageLabel = copy.domain.journeyStage;

/**
 * Fase del percorso (A-07, ST-02): i pulsanti vengono da availableActions(),
 * la stessa tabella di transizioni usata dalla Server Action.
 * Prima dell'attivazione la fase non si cambia: la decide l'origine.
 */
export function StageCard({
  client,
  stageSince,
}: {
  client: ClientProfile;
  stageSince: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  if (!client.hasAccount) {
    return (
      <ProfileSection title={t.title}>
        <p className="text-sm font-medium">{t.notAssigned}</p>
        <p className="text-sm text-muted-foreground">
          {t.notAssignedHint(
            stageLabel[INITIAL_STAGE_BY_ORIGIN[client.origin]],
          )}
        </p>
      </ProfileSection>
    );
  }

  const stage = client.journeyStage;
  const change = (to: typeof stage) =>
    startTransition(async () => {
      const result = await changeStageAction({
        clientId: client.id,
        from: stage,
        to,
      });
      if (redirectIfSignedOut(result)) return;
      if (result.ok) toast.success(t.changed(stageLabel[to]));
      else toast.error(result.error);
    });

  return (
    <ProfileSection title={t.title}>
      <div className="flex flex-col gap-1">
        <StatusBadge status={stage} className="self-start" />
        {stageSince ? (
          <p className="text-sm text-muted-foreground">
            {t.since(stageLabel[stage], formatLongDate(stageSince))}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {availableActions(stage).map(({ to, action }) => (
          <Button
            key={to}
            type="button"
            variant={
              action === "pause" || action === "complete"
                ? "outline"
                : "default"
            }
            disabled={isPending}
            onClick={() => change(to)}
          >
            {t.actions[action]}
          </Button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        {stage === "onboarding" ? t.onboardingHint : t.hint}
      </p>
    </ProfileSection>
  );
}
