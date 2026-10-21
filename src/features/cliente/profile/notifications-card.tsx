"use client";

import { BellRing } from "lucide-react";
import { useId } from "react";

import { ProfileSection } from "@/components/shared/profile-section";
import { Switch } from "@/components/ui/switch";
import { copy } from "@/lib/copy/it";

const t = copy.profile.notifications;

/**
 * Sezione "Notifiche" del profilo (C13, C-07), solo presentazionale: lo stato
 * arriva via props e il cambio passa a `onChange`. Nella fase 8 lo stato
 * diventerà quello della sottoscrizione Web Push di questo dispositivo.
 */
export function NotificationsCard({
  enabled,
  pending,
  onChange,
}: {
  enabled: boolean;
  pending: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const labelId = useId();
  const statusId = useId();
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
            {t.description} {enabled ? t.active : t.inactive}
          </span>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => onChange(checked)}
          disabled={pending}
          aria-labelledby={labelId}
          aria-describedby={statusId}
        />
      </div>
    </ProfileSection>
  );
}
