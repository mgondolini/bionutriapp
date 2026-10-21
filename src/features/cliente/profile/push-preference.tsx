"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { copy } from "@/lib/copy/it";
import { setPushPreferenceAction } from "@/server/actions/profile.actions";

import { NotificationsCard } from "./notifications-card";

/**
 * Collega la sezione Notifiche alla Server Action che salva `push_enabled`.
 * TODO fase 8: prima di salvare, chiedere il permesso del browser e creare
 * (o eliminare) la sottoscrizione Web Push di questo dispositivo; lo stato
 * mostrato sarà quello della sottoscrizione, non solo la preferenza.
 */
export function PushPreference({ enabled }: { enabled: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(enabled);

  const onChange = (next: boolean) => {
    startTransition(async () => {
      setOptimistic(next);
      const result = await setPushPreferenceAction({ enabled: next });
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(copy.profile.notifications.saved(next));
    });
  };

  return (
    <NotificationsCard
      enabled={optimistic}
      pending={isPending}
      onChange={onChange}
    />
  );
}
