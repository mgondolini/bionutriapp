"use client";

import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useSignOut } from "@/lib/auth/use-sign-out";
import { copy } from "@/lib/copy/it";
import { useHydrated } from "@/lib/use-hydrated";
import { logoutAction } from "@/server/actions/auth.actions";

/**
 * Pulsante "Esci", senza conferma. Con JavaScript usa `useSignOut` (endpoint
 * push e navigazione completa); prima dell'idratazione il form chiama
 * direttamente la Server Action, che reindirizza al login.
 */
export function LogoutButton({ className }: { className?: string }) {
  const hydrated = useHydrated();
  const { signOut, isPending } = useSignOut();
  return (
    <form
      action={logoutAction}
      onSubmit={(event) => {
        if (!hydrated) return;
        event.preventDefault();
        signOut("local");
      }}
      className={className}
    >
      <Button
        type="submit"
        variant="outline"
        className="w-full justify-start"
        disabled={isPending}
      >
        <LogOut aria-hidden="true" />
        {copy.common.logout}
      </Button>
    </form>
  );
}
