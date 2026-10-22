"use client";

import { BellRing } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

import { ProfileSection } from "@/components/shared/profile-section";
import { Switch } from "@/components/ui/switch";
import { DeniedHelp } from "@/features/cliente/pwa/denied-help";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import type { DevicePlatform, PushState } from "@/lib/pwa/device";

const t = copy.profile.notifications;

/**
 * Sezione "Notifiche" del profilo (C13, C-07), solo presentazionale: lo stato
 * è quello della sottoscrizione di QUESTO dispositivo e arriva via props.
 * L'interruttore si usa solo quando le push si possono attivare o disattivare.
 */
export function NotificationsCard({
  state,
  platform,
  pending,
  onChange,
}: {
  state: PushState | "loading";
  platform: DevicePlatform | null;
  pending: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const labelId = useId();
  const statusId = useId();
  const usable = state === "active" || state === "ask";
  return (
    <ProfileSection title={t.title}>
      <div className="flex items-center gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BellRing aria-hidden="true" className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span id={labelId} className="text-sm font-semibold">
            {t.label}
          </span>
          <span id={statusId} className="text-sm text-muted-foreground">
            {t.description} {t.status[state]}
          </span>
        </div>
        <Switch
          checked={state === "active"}
          onCheckedChange={(checked) => onChange(checked)}
          disabled={pending || !usable}
          aria-labelledby={labelId}
          aria-describedby={statusId}
        />
      </div>
      {state === "denied" && platform ? (
        <DeniedHelp platform={platform} />
      ) : null}
      {state === "needs-install" ? (
        <Link
          href={ROUTES.client.install}
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t.installLink}
        </Link>
      ) : null}
    </ProfileSection>
  );
}
