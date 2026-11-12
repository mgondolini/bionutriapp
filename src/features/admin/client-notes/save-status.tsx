"use client";

import { AlertTriangle, Check, CircleDot, Loader2 } from "lucide-react";

import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";

import { savedLabel } from "./labels";

const t = copy.clientNotes.status;

export type SaveState = "clean" | "dirty" | "saving" | "failed";

/**
 * Stato del salvataggio, annunciato ai lettori di schermo: "Salvato, oggi
 * alle 18:42", "Modifiche non salvate", "Salvataggio…", "Non salvato,
 * riprova".
 */
export function SaveStatus({
  state,
  savedAt,
  className,
}: {
  state: SaveState;
  savedAt: string;
  className?: string;
}) {
  const Icon =
    state === "clean"
      ? Check
      : state === "saving"
        ? Loader2
        : state === "failed"
          ? AlertTriangle
          : CircleDot;
  const text =
    state === "clean"
      ? savedLabel(savedAt)
      : state === "saving"
        ? t.saving
        : state === "failed"
          ? t.failed
          : t.dirty;
  return (
    <p
      role="status"
      className={cn(
        "flex items-center gap-1.5 text-[13px] text-admin-muted",
        state === "failed" && "font-semibold text-warning-foreground",
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        strokeWidth={1.8}
        className={cn(
          "size-4 shrink-0",
          state === "clean" && "text-primary-ink",
          state === "saving" && "animate-spin",
        )}
      />
      <span className="truncate">{text}</span>
    </p>
  );
}
