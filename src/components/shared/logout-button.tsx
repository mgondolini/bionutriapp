import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy/it";
import { logoutAction } from "@/server/actions/auth.actions";

/** Pulsante "Esci": un form che chiama la Server Action, funziona anche senza JavaScript. */
export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logoutAction} className={className}>
      <Button type="submit" variant="outline" className="w-full justify-start">
        <LogOut aria-hidden="true" />
        {copy.common.logout}
      </Button>
    </form>
  );
}
