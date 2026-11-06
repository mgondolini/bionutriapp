import "server-only";

import webpush, { WebPushError } from "web-push";

import { PUSH_MAX_CONSECUTIVE_FAILURES } from "@/lib/constants/domain";
import type { NotificationPayload } from "@/lib/notifications/catalog";
import * as pushRepository from "@/server/repositories/push.repository";
import type { PushSubscriptionData } from "@/server/validation/push.schema";

/*
 * Web Push (N-04): chiavi VAPID, nessun servizio a pagamento. Registrazione
 * ed eliminazione per l'utente della sessione; l'invio (sendToUser) lo
 * chiama solo notifications.service (N-06).
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

export type DeliveryOutcome =
  | { status: "skipped"; reason: "no_devices" | "not_configured" }
  | {
      status: "sent" | "partial" | "failed";
      delivered: number;
      failed: number;
      removed: number;
    };

/**
 * Invia il payload a tutti i dispositivi dell'utente. 404/410 = sottoscrizione
 * eliminata subito; gli altri errori contano come fallimento consecutivo e
 * oltre PUSH_MAX_CONSECUTIVE_FAILURES la sottoscrizione si elimina. Nei log
 * solo i codici di stato: mai endpoint o contenuto. Non lancia mai per un
 * singolo dispositivo.
 */
export async function sendToUser(
  userId: string,
  payload: NotificationPayload,
  ttlSeconds: number,
): Promise<DeliveryOutcome> {
  const vapid = vapidDetails();
  if (!vapid) return { status: "skipped", reason: "not_configured" };

  const subscriptions = await pushRepository.listSubscriptionsOfUser(userId);
  if (subscriptions.length === 0) {
    return { status: "skipped", reason: "no_devices" };
  }

  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(
    subscriptions.map((target) =>
      webpush.sendNotification(
        {
          endpoint: target.endpoint,
          keys: { p256dh: target.p256dh, auth: target.auth },
        },
        body,
        {
          vapidDetails: vapid,
          TTL: ttlSeconds,
          urgency: "normal",
          timeout: 10_000,
        },
      ),
    ),
  );

  const succeeded: string[] = [];
  const expired: string[] = [];
  const failing: string[] = [];
  const codes: (number | string)[] = [];
  results.forEach((result, index) => {
    const endpoint = subscriptions[index].endpoint;
    if (result.status === "fulfilled") {
      succeeded.push(endpoint);
      return;
    }
    const statusCode =
      result.reason instanceof WebPushError
        ? result.reason.statusCode
        : undefined;
    if (isExpiredSubscription(statusCode)) expired.push(endpoint);
    else {
      failing.push(endpoint);
      codes.push(statusCode ?? "network");
    }
  });

  let removed = expired.length;
  try {
    await pushRepository.deleteSubscriptions(expired);
    removed += await pushRepository.recordPushResults(
      succeeded,
      failing,
      PUSH_MAX_CONSECUTIVE_FAILURES,
    );
  } catch (error) {
    console.error("[push] esito degli invii non salvato", {
      code: (error as { code?: string }).code,
    });
  }
  if (codes.length > 0) {
    // solo i codici: niente endpoint né contenuto
    console.error("[push] invio non riuscito", { codes });
  }

  const failed = expired.length + failing.length;
  return {
    status: succeeded.length === 0 ? "failed" : failed > 0 ? "partial" : "sent",
    delivered: succeeded.length,
    failed,
    removed,
  };
}
