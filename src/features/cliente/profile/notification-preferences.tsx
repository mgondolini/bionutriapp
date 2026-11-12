"use client";

import { Files, type LucideIcon } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { copy } from "@/lib/copy/it";
import { NOTIFICATION_ICONS } from "@/lib/notifications/icons";
import { setNotificationPreferenceAction } from "@/server/actions/notifications.actions";
import type { NotificationPreferenceInput } from "@/server/validation/notifications.schema";

const t = copy.profile.notifications.preferences;

type PreferenceKey = NotificationPreferenceInput["key"];
export type NotificationPreferencesValue = Record<PreferenceKey, boolean>;

const ROWS: { key: PreferenceKey; icon: LucideIcon }[] = [
  { key: "filesEnabled", icon: Files },
  { key: "dailyReminderEnabled", icon: NOTIFICATION_ICONS.daily_checkin },
  { key: "videosEnabled", icon: NOTIFICATION_ICONS.video },
  { key: "measureCheckEnabled", icon: NOTIFICATION_ICONS.measure_check },
];

function PreferenceRow({
  preferenceKey,
  icon: Icon,
  checked,
  pending,
  onChange,
}: {
  preferenceKey: PreferenceKey;
  icon: LucideIcon;
  checked: boolean;
  pending: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const labelId = useId();
  const descriptionId = useId();
  return (
    <li className="flex min-h-14 items-center gap-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-tint text-secondary-foreground">
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span id={labelId} className="text-sm font-semibold">
          {t[preferenceKey].label}
        </span>
        <span id={descriptionId} className="text-sm text-muted-foreground">
          {t[preferenceKey].description}
        </span>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={(value) => onChange(value)}
        disabled={pending}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
      />
    </li>
  );
}

/**
 * "Nuovi file" e "Promemoria serale" (C-07): preferenze dell'utente, valide
 * su tutti i dispositivi; si salvano subito e tornano indietro se il server
 * non le accetta.
 */
export function NotificationPreferences({
  initial,
}: {
  initial: NotificationPreferencesValue;
}) {
  const [values, setValues] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const change = (key: PreferenceKey, enabled: boolean) => {
    const previous = values;
    setValues({ ...values, [key]: enabled });
    startTransition(async () => {
      const result = await setNotificationPreferenceAction({ key, enabled });
      if (redirectIfSignedOut(result)) return;
      if (!result.ok) {
        setValues(previous);
        toast.error(result.error);
        return;
      }
      toast.success(t.saved);
    });
  };

  return (
    <div className="flex flex-col gap-3 border-t pt-4">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold">{t.title}</h3>
        <p className="text-[13px] text-muted-foreground">{t.hint}</p>
      </div>
      <ul className="flex flex-col gap-3">
        {ROWS.map(({ key, icon }) => (
          <PreferenceRow
            key={key}
            preferenceKey={key}
            icon={icon}
            checked={values[key]}
            pending={isPending}
            onChange={(enabled) => change(key, enabled)}
          />
        ))}
      </ul>
    </div>
  );
}
