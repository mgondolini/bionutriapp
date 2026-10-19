"use client";

import { Download, ExternalLink } from "lucide-react";
import { useTransition, type ComponentProps } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { FileOpenMode } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { openFileAction } from "@/server/actions/files.actions";

const t = copy.files;

type OpenFileButtonProps = {
  fileId: string;
  title: string;
  mode: FileOpenMode;
  /** Testo visibile; il nome accessibile contiene sempre il titolo del file. */
  label: string;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
};

/**
 * Apre o scarica un PDF con un URL firmato di 60 secondi chiesto alla Server
 * Action openFile (unico percorso per staff e cliente, DEV-05).
 * - "view": la finestra si apre in modo sincrono al clic (altrimenti il
 *   browser la blocca come popup) e riceve l'indirizzo alla risposta; sulla
 *   PWA installata su iPhone si apre il visualizzatore di Safari.
 * - "download": nessuna finestra; l'URL forza lo scaricamento, quindi la
 *   pagina resta dov'è e non rimane una scheda vuota.
 */
export function OpenFileButton({
  fileId,
  title,
  mode,
  label,
  variant = mode === "view" ? "default" : "outline",
  size,
  className,
}: OpenFileButtonProps) {
  const [isPending, startTransition] = useTransition();
  const Icon = mode === "view" ? ExternalLink : Download;

  const open = () => {
    const popup = mode === "view" ? window.open("", "_blank") : null;
    if (popup) {
      // il visualizzatore non deve poter controllare questa finestra
      popup.opener = null;
      popup.document.title = t.opening;
      if (popup.document.body) popup.document.body.textContent = t.opening;
    }

    startTransition(async () => {
      const result = await openFileAction({ fileId, mode });
      if (!result.ok) {
        popup?.close();
        toast.error(result.error);
        return;
      }
      const { url } = result.data;
      if (mode === "download") {
        window.location.assign(url);
      } else if (popup && !popup.closed) {
        popup.location.replace(url);
      } else {
        // finestra bloccata: un nuovo tocco dell'utente la apre di sicuro
        toast.warning(t.popupBlocked, {
          action: {
            label: t.popupRetry,
            onClick: () => window.open(url, "_blank", "noopener"),
          },
        });
      }
    });
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={open}
      disabled={isPending}
      aria-label={mode === "view" ? t.openAria(title) : t.downloadAria(title)}
      className={className}
    >
      <Icon aria-hidden="true" />
      {isPending && mode === "view" ? t.opening : label}
    </Button>
  );
}
