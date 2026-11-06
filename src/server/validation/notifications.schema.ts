// Schemi Zod condivisi tra form (client) e Server Actions: niente "server-only".
import { z } from "zod";

/** Interruttori del profilo (C-07): un'impostazione alla volta. */
export const notificationPreferenceSchema = z.object({
  key: z.enum(["filesEnabled", "dailyReminderEnabled"]),
  enabled: z.boolean(),
});
export type NotificationPreferenceInput = z.infer<
  typeof notificationPreferenceSchema
>;
