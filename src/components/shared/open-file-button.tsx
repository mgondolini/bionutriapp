"use client";

import { ChevronRight, Download, ExternalLink, Eye } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTransition, type ComponentProps } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import {
  ROUTES,
  fileViewerPath,
  type FileOpenMode,
} from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { openFileAction } from "@/server/actions/files.actions";

const t = copy.files;

type OpenFileButtonProps = {
  fileId: string;
  title: string;
  mode: FileOpenMode;
  /** Testo visibile; il nome accessibile contiene sempre il titolo del file. */
  label: string;
  /** Icona: per "view" occhio (predefinita: il PDF si apre nell'app), finestra esterna, oppure freccia dopo il testo. */
  icon?: "external" | "eye" | "chevron";
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
};

/**
 * Apre o scarica un PDF.
 * - "view": va al visualizzatore dell'app (react-pdf, `fileViewerPath`),
 *   che chiede l'URL firmato e registra la prima lettura: così i link
 *   interni del PDF funzionano su iPhone, Android e desktop.
 * - "download": URL firmato di 60 secondi chiesto alla Server Action
 *   openFile (unico percorso per staff e cliente, DEV-05); l'URL forza lo
 *   scaricamento, quindi la pagina resta dov'è.
 */
export function useOpenFile(fileId: string, mode: FileOpenMode) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();

  const open = () => {
    if (mode === "view") {
      const area = pathname.startsWith(ROUTES.admin.home) ? "admin" : "client";
      startTransition(() => router.push(fileViewerPath(area, fileId)));
      return;
    }
    startTransition(async () => {
      const result = await openFileAction({ fileId, mode });
      if (!result.ok) {
        if (redirectIfSignedOut(result)) return;
        toast.error(result.error);
        return;
      }
      window.location.assign(result.data.url);
    });
  };

  return { open, isPending };
}

/** Pulsante che apre o scarica un PDF (vedi `useOpenFile`). */
export function OpenFileButton({
  fileId,
  title,
  mode,
  label,
  icon,
  variant = mode === "view" ? "default" : "outline",
  size,
  className,
}: OpenFileButtonProps) {
  const { open, isPending } = useOpenFile(fileId, mode);
  const Icon =
    mode === "download" ? Download : icon === "external" ? ExternalLink : Eye;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={open}
      disabled={isPending}
      aria-label={t.actionAria(label, title)}
      className={className}
    >
      {icon === "chevron" ? null : <Icon aria-hidden="true" />}
      {isPending && mode === "view" ? t.opening : label}
      {icon === "chevron" ? <ChevronRight aria-hidden="true" /> : null}
    </Button>
  );
}
