"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { copy } from "@/lib/copy/it";
import { formatLongDate } from "@/lib/format";
import {
  disableAccountAction,
  enableAccountAction,
} from "@/server/actions/clients.actions";
import type { ClientProfile } from "@/server/services/clients.service";

import {
  ProfileItem,
  ProfileSection,
} from "@/components/shared/profile-section";

const t = copy.admin.clients.profile.account;

/** Stato dell'account, attivazione, notifiche; disattivazione e riattivazione con conferma (A-06, ST-01). */
export function AccountCard({
  client,
  name,
}: {
  client: ClientProfile;
  name: string;
}) {
  const disabled = client.accountStatus === "disabled";
  // Azione decisa all'apertura del dialog: non cambia mentre si chiude dopo l'aggiornamento.
  const [pendingAction, setPendingAction] = useState<"enable" | "disable">(
    disabled ? "enable" : "disable",
  );
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const enabling = pendingAction === "enable";

  const open = () => {
    setPendingAction(disabled ? "enable" : "disable");
    setConfirming(true);
  };

  const confirm = () => {
    setError(null);
    startTransition(async () => {
      const action = enabling ? enableAccountAction : disableAccountAction;
      const result = await action({ clientId: client.id });
      if (redirectIfSignedOut(result)) return;
      if (result.ok) {
        toast.success(enabling ? t.enabled : t.disabled);
        setConfirming(false);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <ProfileSection title={t.title}>
      <dl className="grid gap-4">
        <ProfileItem label={t.status}>
          <StatusBadge status={client.accountStatus} />
        </ProfileItem>
        <ProfileItem label={t.activation}>
          {client.activatedAt
            ? formatLongDate(client.activatedAt)
            : t.notActivated}
        </ProfileItem>
        <ProfileItem label={t.notifications}>
          {!client.hasAccount
            ? t.noNotifications
            : client.pushEnabled
              ? t.pushOn
              : t.pushOff}
        </ProfileItem>
      </dl>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant={disabled ? "default" : "outline"}
          onClick={open}
          className="self-start"
        >
          {disabled ? t.enable : t.disable}
        </Button>
        <p className="text-sm text-muted-foreground">
          {disabled ? t.enableHint : t.disableHint}
        </p>
      </div>

      <Dialog
        open={confirming}
        onOpenChange={(open) => {
          setConfirming(open);
          if (!open) setError(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {disabled
                ? t.confirmEnableTitle(name)
                : t.confirmDisableTitle(name)}
            </DialogTitle>
            <DialogDescription>
              {enabling ? t.confirmEnable : t.confirmDisable}
            </DialogDescription>
          </DialogHeader>
          {error ? <FormMessage>{error}</FormMessage> : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirming(false)}
            >
              {t.cancel}
            </Button>
            <Button
              type="button"
              variant={enabling ? "default" : "destructive"}
              onClick={confirm}
              disabled={isPending}
            >
              {enabling ? t.enable : t.disable}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProfileSection>
  );
}
