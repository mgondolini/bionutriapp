"use client";

import { usePush } from "@/features/cliente/pwa/use-push";

import { NotificationsCard } from "./notifications-card";

/**
 * Collega la sezione Notifiche alla sottoscrizione Web Push di questo
 * dispositivo: acceso = permesso, sottoscrizione creata e salvata; spento =
 * sottoscrizione annullata ed eliminata. push_enabled (visibile allo staff)
 * lo aggiorna il database: vero se il cliente ha almeno un dispositivo.
 */
export function PushPreference({
  registeredEndpoints,
}: {
  registeredEndpoints: readonly string[];
}) {
  const { state, device, enable, disable, isPending } =
    usePush(registeredEndpoints);
  return (
    <NotificationsCard
      state={state}
      platform={device?.platform ?? null}
      pending={isPending}
      onChange={(enabled) => (enabled ? enable() : disable())}
    />
  );
}
