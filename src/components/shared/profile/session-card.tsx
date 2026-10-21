"use client";

import { LogOut, MonitorSmartphone } from "lucide-react";
import { useState } from "react";

import { ProfileSection } from "@/components/shared/profile-section";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSignOut } from "@/lib/auth/use-sign-out";
import { copy } from "@/lib/copy/it";

const t = copy.profile.session;

/**
 * Uscita dal profilo (C13 e profilo del professionista): "Esci" senza
 * conferma, "Esci da tutti i dispositivi" con conferma (chiude ogni sessione
 * ed elimina tutte le sottoscrizioni push dell'utente).
 */
export function SessionCard() {
  const { signOut, isPending } = useSignOut();
  const [confirming, setConfirming] = useState(false);
  return (
    <ProfileSection title={t.title}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={() => signOut("local")}
            disabled={isPending}
          >
            <LogOut aria-hidden="true" />
            {t.logout}
          </Button>
          <p className="text-sm text-muted-foreground">{t.logoutHint}</p>
        </div>
        <div className="flex flex-col gap-1 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={() => setConfirming(true)}
            disabled={isPending}
          >
            <MonitorSmartphone aria-hidden="true" />
            {t.logoutAll}
          </Button>
          <p className="text-sm text-muted-foreground">{t.logoutAllHint}</p>
        </div>
      </div>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.logoutAllTitle}</DialogTitle>
            <DialogDescription>{t.logoutAllDescription}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirming(false)}
              disabled={isPending}
            >
              {t.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => signOut("global")}
              disabled={isPending}
            >
              {t.logoutAllConfirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProfileSection>
  );
}
