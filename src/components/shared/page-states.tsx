"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy/it";

/** Contenuto di loading.tsx (DEV-13). */
export function PageLoading() {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 py-16 text-muted-foreground"
    >
      <Loader2 aria-hidden="true" className="size-5 animate-spin" />
      <span>{copy.common.loading}</span>
    </div>
  );
}

/** Contenuto di error.tsx (DEV-13): messaggio generico e pulsante "Riprova". */
export function PageError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <EmptyState
      icon={AlertTriangle}
      title={copy.common.errorTitle}
      description={copy.common.errorDescription}
      action={
        <Button type="button" onClick={() => retry()}>
          {copy.common.retry}
        </Button>
      }
    />
  );
}
