import { cva } from "class-variance-authority";
import { Check } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import type { MetricKind } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import type { CircumferenceStatus } from "@/lib/domain/tracking/circumferences";
import { cn } from "@/lib/utils";

import { MetricIcon } from "./metric-icon";

const t = copy.tracking;

const statusVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      status: {
        ok: "bg-success text-success-foreground",
        due_soon: "bg-info text-info-foreground",
        overdue: "bg-warning text-warning-foreground",
        never: "border border-dashed text-muted-foreground",
      } satisfies Record<CircumferenceStatus, string>,
    },
  },
);

/** "In ritardo", "In scadenza", "Da registrare", "In regola". */
export function MetricStatusBadge({
  status,
  className,
}: {
  status: CircumferenceStatus;
  className?: string;
}) {
  return (
    <span className={cn(statusVariants({ status }), className)}>
      {t.status[status]}
    </span>
  );
}

/** Spunta di T-01: misura già registrata nel periodo corrente. */
export function RecordedTick() {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
      <Check aria-hidden="true" className="size-4" />
      <span className="sr-only">{t.recordedAria}</span>
    </span>
  );
}

const iconVariants = cva(
  "flex size-10 shrink-0 items-center justify-center rounded-lg",
  {
    variants: {
      kind: {
        circumference: "bg-muted text-foreground",
        habit: "bg-primary/10 text-primary",
        workout: "bg-accent text-accent-foreground",
      } satisfies Record<MetricKind, string>,
    },
  },
);

const cardVariants = cva("flex text-card-foreground", {
  variants: {
    layout: {
      /** Riga dell'elenco del cliente (C8): tutta la riga porta al dettaglio. */
      row: "items-center gap-3 rounded-xl border bg-card px-4 py-3",
      /** Card della scheda Tracking dello staff (A9). */
      panel: "flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs",
    },
    interactive: {
      true: "transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
      false: "",
    },
  },
  defaultVariants: { interactive: false },
});

type MetricCardProps = {
  kind: MetricKind;
  layout: "row" | "panel";
  icon: string;
  title: string;
  /** Istruzione della misura o sottotitolo. */
  description?: string | null;
  /** Righe brevi sotto il titolo (registrazioni, ultima data…). */
  meta?: ReactNode;
  status?: CircumferenceStatus | null;
  recorded?: boolean;
  /** Dettaglio della misura: la riga diventa un link; nel pannello lo diventa il titolo. */
  href?: string;
  /** Contenuto della card (valori, medie, pulsanti). */
  children?: ReactNode;
  className?: string;
};

/**
 * Card di una misura (DEV-02, DEV-12): stessa struttura per circonferenze,
 * abitudini e allenamenti, che cambiano solo per variante e contenuto.
 * Usata nell'area cliente (C8) e nella scheda Tracking dello staff (A9).
 */
export function MetricCard({
  kind,
  layout,
  icon,
  title,
  description,
  meta,
  status,
  recorded,
  href,
  children,
  className,
}: MetricCardProps) {
  const header = (
    <>
      <span className={iconVariants({ kind })}>
        <MetricIcon name={icon} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold">
            {href && layout === "panel" ? (
              <Link
                href={href}
                className="rounded-sm underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {title}
              </Link>
            ) : (
              title
            )}
          </h3>
          {status && status !== "ok" ? (
            <MetricStatusBadge status={status} />
          ) : null}
        </div>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
        {meta ? (
          <div className="text-xs text-muted-foreground">{meta}</div>
        ) : null}
      </div>
      {recorded ? <RecordedTick /> : null}
    </>
  );

  if (layout === "row") {
    const classes = cn(
      cardVariants({ layout, interactive: Boolean(href) }),
      className,
    );
    return href ? (
      <Link href={href} className={classes}>
        {header}
        {children}
      </Link>
    ) : (
      <article className={classes}>
        {header}
        {children}
      </article>
    );
  }

  return (
    <article className={cn(cardVariants({ layout }), className)}>
      <div className="flex items-start gap-3">{header}</div>
      {children}
    </article>
  );
}
