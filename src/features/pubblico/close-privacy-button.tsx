"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

const t = copy.privacy;

/**
 * Chiude l'informativa: se è stata aperta in una scheda nuova la chiude,
 * altrimenti torna alla pagina precedente o, se non c'è, all'accesso.
 * Nell'app installata non ci sono la barra né il tasto Indietro del browser.
 */
export function ClosePrivacyButton({
  variant,
}: {
  variant: "icon" | "button";
}) {
  const router = useRouter();
  const close = () => {
    window.close();
    // window.close() non fa nulla se la scheda non è stata aperta da un link
    if (window.history.length > 1) router.back();
    else router.replace(ROUTES.login);
  };
  return variant === "icon" ? (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={close}
      aria-label={t.closeAria}
      className="rounded-xl"
    >
      <X aria-hidden="true" />
    </Button>
  ) : (
    <Button type="button" size="lg" onClick={close} className="w-full">
      {t.close}
    </Button>
  );
}
