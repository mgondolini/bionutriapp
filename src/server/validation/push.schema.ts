import { z } from "zod";

import {
  PUSH_ENDPOINT_MAX_LENGTH,
  PUSH_SERVICE_HOSTS,
  PUSH_USER_AGENT_MAX_LENGTH,
} from "@/lib/constants/domain";

/*
 * Sottoscrizioni Web Push (fase 8). L'endpoint arriva dal browser e il
 * server ci invierà richieste: si accettano solo indirizzi https dei servizi
 * push noti (PUSH_SERVICE_HOSTS), mai un indirizzo qualunque.
 */

/** Vero se l'endpoint è https e appartiene a un servizio push noto. */
export function isAllowedPushEndpoint(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port !== "" || url.username) {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return PUSH_SERVICE_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`),
  );
}

const base64Url = (min: number, max: number) =>
  z
    .string()
    .min(min)
    .max(max)
    .regex(/^[A-Za-z0-9_-]+={0,2}$/);

export const pushEndpointSchema = z
  .string()
  .max(PUSH_ENDPOINT_MAX_LENGTH)
  .refine(isAllowedPushEndpoint);

/** Forma di `PushSubscription.toJSON()`: chiave P-256 (65 byte) e segreto (16 byte). */
export const pushSubscriptionSchema = z.object({
  endpoint: pushEndpointSchema,
  keys: z.object({
    p256dh: base64Url(80, 100),
    auth: base64Url(16, 30),
  }),
  // solo per riconoscere il dispositivo; troncato, mai obbligatorio
  userAgent: z
    .string()
    .nullish()
    .transform((value) =>
      value ? value.slice(0, PUSH_USER_AGENT_MAX_LENGTH) : null,
    ),
});
export type PushSubscriptionInput = z.input<typeof pushSubscriptionSchema>;
export type PushSubscriptionData = z.output<typeof pushSubscriptionSchema>;

/** Disattivazione dal profilo: solo l'endpoint di questo dispositivo. */
export const pushEndpointInputSchema = z.object({
  endpoint: z.string().min(1).max(PUSH_ENDPOINT_MAX_LENGTH),
});
export type PushEndpointInput = z.output<typeof pushEndpointInputSchema>;
