"use client";

import { MessageCircle } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy/it";
import { sendWhatsAppInviteAction } from "@/server/actions/invites.actions";

const t = copy.admin.clients.invite;

type WhatsAppInviteButtonProps = {
  clientId: string;
  name: string;
  label: string;
  ariaLabel?: string;
  variant?: "default" | "outline";
  className?: string;
};

/**
 * Apre WhatsApp con il messaggio di invito (N-01). La finestra si apre in modo
 * sincrono al clic (altrimenti i browser la bloccano come popup) e riceve
 * l'indirizzo wa.me quando la Server Action risponde. La riga si aggiorna da
 * sola (revalidatePath), così gli inviti si mandano uno dopo l'altro.
 */
export function WhatsAppInviteButton({
  clientId,
  name,
  label,
  ariaLabel,
  variant = "default",
  className,
}: WhatsAppInviteButtonProps) {
  const [isPending, startTransition] = useTransition();

  const send = () => {
    const popup = window.open("", "_blank");
    if (popup) {
      // la pagina di WhatsApp non deve poter controllare questa finestra
      popup.opener = null;
      popup.document.title = t.sending;
      if (popup.document.body) popup.document.body.textContent = t.sending;
    }

    startTransition(async () => {
      const result = await sendWhatsAppInviteAction({ clientId });
      if (!result.ok) {
        popup?.close();
        toast.error(result.error);
        return;
      }
      const { whatsappUrl } = result.data;
      if (popup && !popup.closed) {
        popup.location.replace(whatsappUrl);
        toast.success(t.sent(name));
      } else {
        // finestra bloccata: un nuovo clic dell'utente la apre di sicuro
        toast.warning(t.popupBlocked, {
          action: {
            label: copy.admin.clients.actions.invite,
            onClick: () => window.open(whatsappUrl, "_blank", "noopener"),
          },
        });
      }
    });
  };

  return (
    <Button
      type="button"
      variant={variant}
      onClick={send}
      disabled={isPending}
      aria-label={ariaLabel}
      className={className}
    >
      <MessageCircle aria-hidden="true" />
      {isPending ? t.sending : label}
    </Button>
  );
}
