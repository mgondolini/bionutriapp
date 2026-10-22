import "server-only";

import webpush, { WebPushError } from "web-push";

import { PUSH_TTL_SECONDS } from "@/lib/constants/domain";
import type { NotificationPayload } from "@/lib/notifications/payload";
import * as pushRepository from "@/server/repositories/push.repository";
import type { PushSubscriptionData } from "@/server/validation/push.schema";

/*
 * Web Push (N-04): chiavi VAPID, nessun servizio a pagamento. Registrazione
 * ed eliminazione per l'utente della sessione; l'invio lo chiama solo
 * notifications.service (N-06).
 */

/** Salva la sottoscrizione di questo browser per l'utente corrente. */
export function subscribe(data: PushSubscriptionData): Promise<boolean> {
  return pushRepository.registerOwnSubscription({
    endpoint: data.endpoint,
    p256dh: data.keys.p256dh,
    auth: data.keys.auth,
    userAgent: data.userAgent,
  });
}

/** Elimina la sottoscrizione di questo browser (la RLS limita alle proprie). */
export function unsubscribe(endpoint: string): Promise<void> {
  return pushRepository.deleteOwnSubscription(endpoint);
}

/**
 * Endpoint registrati dall'utente corrente: il browser li confronta con la
 * propria sottoscrizione (attiva solo se il server la conosce).
 */
export function listOwnEndpoints(): Promise<string[]> {
  return pushRepository.listOwnEndpoints();
}

/** Il servizio push dice che la sottoscrizione non esiste più. */
export function isExpiredSubscription(statusCode: number | undefined) {
  return statusCode === 404 || statusCode === 410;
}

function vapidDetails() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return null;
  return { publicKey, privateKey, subject };
}

export type SendOutcome =
  | {
      status: "skipped";
      reason: "not_found" | "inactive" | "no_devices" | "not_configured";
    }
  | { status: "sent"; delivered: number; removed: number; failed: number };

/**
 * Invia la notifica a tutti i dispositivi del cliente. Le sottoscrizioni che
 * rispondono 404 o 410 vengono eliminate; gli altri errori restano nei log
 * con il solo codice di stato. Non lancia mai per un singolo dispositivo.
 */
export async function sendToClient(
  clientId: string,
  buildPayload: (studio: { name: string }) => NotificationPayload,
): Promise<SendOutcome> {
  const vapid = vapidDetails();
  if (!vapid) return { status: "skipped", reason: "not_configured" };

  const targets = await pushRepository.getClientPushTargets(clientId);
  if (!targets) return { status: "skipped", reason: "not_found" };
  // un cliente disattivato non accede all'app: nessun avviso
  if (targets.accountStatus !== "active") {
    return { status: "skipped", reason: "inactive" };
  }
  if (targets.subscriptions.length === 0) {
    return { status: "skipped", reason: "no_devices" };
  }

  const payload = JSON.stringify(buildPayload({ name: targets.studioName }));
  const results = await Promise.allSettled(
    targets.subscriptions.map((target) =>
      webpush.sendNotification(
        {
          endpoint: target.endpoint,
          keys: { p256dh: target.p256dh, auth: target.auth },
        },
        payload,
        {
          vapidDetails: vapid,
          TTL: PUSH_TTL_SECONDS,
          urgency: "normal",
          timeout: 10_000,
        },
      ),
    ),
  );

  const expired: string[] = [];
  const failures: (number | string)[] = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") return;
    const statusCode =
      result.reason instanceof WebPushError
        ? result.reason.statusCode
        : undefined;
    if (isExpiredSubscription(statusCode)) {
      expired.push(targets.subscriptions[index].endpoint);
    } else {
      failures.push(statusCode ?? "network");
    }
  });

  if (expired.length > 0) {
    try {
      await pushRepository.deleteSubscriptions(expired);
    } catch (error) {
      console.error("[push] sottoscrizioni scadute non eliminate", {
        clientId,
        code: (error as { code?: string }).code,
      });
    }
  }
  if (failures.length > 0) {
    // solo id del cliente e codici: niente endpoint né contenuto
    console.error("[push] invio non riuscito", { clientId, codes: failures });
  }
  return {
    status: "sent",
    delivered: results.length - expired.length - failures.length,
    removed: expired.length,
    failed: failures.length,
  };
}
