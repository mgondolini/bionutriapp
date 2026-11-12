import { cva } from "class-variance-authority";

import type { PhotoSetState } from "@/lib/photos/status";
import { cn } from "@/lib/utils";

import { PhotoStatusBadge } from "./photo-status-badge";

const cardVariants = cva("flex flex-col rounded-[20px]", {
  variants: {
    tone: {
      // da completare: bordo pesca (A20)
      open: "gap-5 border-2 border-warm bg-card p-5 sm:p-6",
      saved: "gap-5 border border-admin-line bg-card p-5 sm:p-6",
      // prossima: tratteggiata, senza azioni
      future:
        "gap-1 border-[1.5px] border-dashed border-admin-field bg-background px-5 py-4 sm:px-6",
    },
  },
});

function toneOf(state: Exclude<PhotoSetState, "skipped">) {
  if (state === "saved") return "saved" as const;
  if (state === "future") return "future" as const;
  return "open" as const;
}

/**
 * Riquadro di un set (A20, C22): numero del check, stato, data e chi ha
 * salvato; `action` è il pulsante a destra del titolo, `children` le foto.
 */
export function PhotoSetCard({
  id,
  title,
  state,
  count,
  subtitle,
  action,
  aside,
  className,
  children,
}: {
  id: string;
  title: string;
  state: Exclude<PhotoSetState, "skipped">;
  count: number;
  subtitle: string;
  action?: React.ReactNode;
  /** Nota a destra (riga "Prossima"). */
  aside?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  const tone = toneOf(state);
  return (
    <section
      aria-labelledby={id}
      className={cn(cardVariants({ tone }), className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2
              id={id}
              className="text-xl leading-[26px] font-bold tracking-tight"
            >
              {title}
            </h2>
            <PhotoStatusBadge status={state} count={count} />
          </div>
          <p className="text-sm text-admin-muted">{subtitle}</p>
        </div>
        {action}
        {aside ? (
          <p className="max-w-[300px] text-[13px] leading-5 text-admin-muted">
            {aside}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
