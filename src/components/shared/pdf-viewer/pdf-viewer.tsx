"use client";

import { ChevronLeft, Download, RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

import { useOpenFile } from "@/components/shared/open-file-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { redirectIfSignedOut } from "@/lib/auth/session-expired";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";
import {
  openFileAction,
  type OpenedFile,
} from "@/server/actions/files.actions";

const t = copy.files.viewer;

// PDF.js usa le API del browser (canvas, worker): niente rendering sul server
const PdfDocument = dynamic(() => import("./pdf-document"), {
  ssr: false,
  loading: () => <Status>{t.loading}</Status>,
});

type ViewerState =
  | { status: "loading" }
  | { status: "ready"; file: OpenedFile }
  | { status: "error"; message: string; file: OpenedFile | null };

/**
 * Visualizzatore dei PDF nell'app (staff e cliente): chiede l'URL firmato
 * alla Server Action openFile (che registra anche la prima lettura del
 * cliente) e il browser scarica il PDF direttamente da Supabase (NF-14).
 * Se il documento non si carica (per esempio l'URL è scaduto) "Riprova"
 * chiede un nuovo URL.
 */
export function PdfViewer({
  fileId,
  area,
}: {
  fileId: string;
  area: "admin" | "client";
}) {
  const [state, setState] = useState<ViewerState>({ status: "loading" });
  const [pages, setPages] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const download = useOpenFile(fileId, "download");

  const fetchFile = useCallback(() => {
    startTransition(async () => {
      const result = await openFileAction({ fileId, mode: "view" });
      if (!result.ok) {
        if (redirectIfSignedOut(result)) return;
        setState({ status: "error", message: result.error, file: null });
        return;
      }
      setState({ status: "ready", file: result.data });
    });
  }, [fileId]);

  useEffect(() => {
    fetchFile();
  }, [fetchFile]);

  const retry = () => {
    setState({ status: "loading" });
    fetchFile();
  };

  const file = state.status === "loading" ? null : state.file;
  const backHref =
    file?.backHref ??
    (area === "admin" ? ROUTES.admin.clients : ROUTES.client.home);

  return (
    <div className="flex flex-col gap-4">
      <header className="sticky top-0 z-10 -mx-1 flex items-center gap-3 bg-background/95 px-1 py-2 backdrop-blur">
        <Link
          href={backHref}
          aria-label={t.back}
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "shrink-0 rounded-xl",
          )}
        >
          <ChevronLeft aria-hidden="true" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-lg leading-tight font-bold">
            {file?.title ?? t.title}
          </h1>
          {pages ? (
            <p className="text-[13px] text-muted-foreground">
              {t.pages(pages)}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={download.open}
          disabled={download.isPending}
          className="shrink-0"
        >
          <Download aria-hidden="true" />
          <span className="max-sm:sr-only">{copy.files.download}</span>
        </Button>
      </header>

      {state.status === "ready" ? (
        <PdfDocument
          url={state.file.url}
          onPages={setPages}
          onError={() =>
            setState({ status: "error", message: t.error, file: state.file })
          }
        />
      ) : state.status === "error" ? (
        <div
          role="alert"
          className="flex flex-col items-center gap-3 rounded-[20px] border bg-card px-4 py-10 text-center"
        >
          <p className="text-sm">{state.message}</p>
          <Button type="button" variant="outline" onClick={retry}>
            <RotateCcw aria-hidden="true" />
            {t.retry}
          </Button>
        </div>
      ) : (
        <Status>{t.loading}</Status>
      )}
    </div>
  );
}

function Status({ children }: { children: string }) {
  return (
    <p
      role="status"
      className="rounded-[20px] border bg-card px-4 py-10 text-center text-sm text-muted-foreground"
    >
      {children}
    </p>
  );
}
