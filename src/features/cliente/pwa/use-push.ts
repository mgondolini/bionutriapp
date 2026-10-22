"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { copy } from "@/lib/copy/it";
import { pushState, type PushState } from "@/lib/pwa/device";
import {
  readPermission,
  readPushSupport,
  readRegisteredSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/pwa/push-client";
import {
  deletePushSubscriptionAction,
  savePushSubscriptionAction,
} from "@/server/actions/push.actions";

import { usePwa } from "./pwa-provider";

const t = copy.push;

/**
 * Stato delle notifiche push su QUESTO dispositivo (banner C5, profilo C13).
 * `registeredEndpoints` arriva dalla pagina: le sottoscrizioni che il server
 * conosce per l'utente corrente. "loading" finché il browser non ha risposto.
 */
export function usePush(registeredEndpoints: readonly string[]) {
  const { device } = usePwa();
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [permission, setPermission] = useState(() =>
    typeof window === "undefined" ? "default" : readPermission(),
  );
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    setPermission(readPermission());
    try {
      const subscription =
        await readRegisteredSubscription(registeredEndpoints);
      setSubscribed(subscription !== null);
    } catch {
      setSubscribed(false);
    }
  }, [registeredEndpoints]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- stato del browser, letto dopo il montaggio
    void refresh();
    // il permesso può cambiare dalle impostazioni mentre l'app è in background
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refresh]);

  const state: PushState | "loading" =
    device === null || subscribed === null
      ? "loading"
      : pushState({
          device,
          support: readPushSupport(),
          permission,
          subscribed,
        });

  /** Da chiamare direttamente dal tocco su "Attiva" (iPhone lo richiede). */
  const enable = () => {
    startTransition(async () => {
      const outcome = await subscribeToPush();
      setPermission(readPermission());
      if (!outcome.ok) {
        if (outcome.reason === "failed") toast.error(t.errors.failed);
        return;
      }
      const { endpoint, keys } = outcome.subscription;
      const result = await savePushSubscriptionAction({
        endpoint: endpoint ?? "",
        keys: { p256dh: keys?.p256dh ?? "", auth: keys?.auth ?? "" },
        userAgent: navigator.userAgent,
      });
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        // il server non l'ha salvata: niente sottoscrizione "a metà"
        await unsubscribeFromPush();
        toast.error(result.error);
        return;
      }
      setSubscribed(true);
      toast.success(copy.profile.notifications.saved(true));
    });
  };

  const disable = () => {
    startTransition(async () => {
      const endpoint = await unsubscribeFromPush();
      setSubscribed(false);
      if (!endpoint) return;
      const result = await deletePushSubscriptionAction({ endpoint });
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        toast.error(t.errors.disableFailed);
        return;
      }
      toast.success(copy.profile.notifications.saved(false));
    });
  };

  return { state, device, enable, disable, isPending };
}
