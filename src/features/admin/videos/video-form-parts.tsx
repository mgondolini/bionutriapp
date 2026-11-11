"use client";

import { CircleAlert } from "lucide-react";

import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";

export const TEXTAREA_CLASS =
  "min-h-21 w-full rounded-[10px] border border-input bg-card px-3.5 py-2.5 text-base outline-none placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-mint disabled:opacity-50 aria-invalid:border-warning-foreground md:text-sm";

/** Select nativo con lo stile dei campi: affidabile su telefono e da tastiera. */
export const SELECT_CLASS =
  "h-11 w-full min-w-0 rounded-[10px] border border-input bg-card px-3 text-base outline-none focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-mint disabled:opacity-50 aria-invalid:border-warning-foreground md:text-sm";

export type LinkErrorCode = keyof typeof copy.admin.videos.videoForm.errors;

export function isLinkErrorCode(value: string): value is LinkErrorCode {
  return value in copy.admin.videos.videoForm.errors;
}

/** Link rifiutato (A15): cosa è successo e cosa fare; il salvataggio resta bloccato. */
export function LinkErrorBox({
  code,
  id,
  className,
}: {
  code: LinkErrorCode;
  id?: string;
  className?: string;
}) {
  const t = copy.admin.videos.videoForm.errors[code];
  return (
    <div
      id={id}
      role="alert"
      className={cn(
        "flex gap-3 rounded-xl bg-warning p-4 text-sm text-warning-foreground",
        className,
      )}
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="flex flex-col gap-1">
        <p className="font-semibold">{t.lead}</p>
        <p className="font-bold text-foreground">{t.title}</p>
        <p className="text-foreground">{t.text}</p>
      </div>
    </div>
  );
}
