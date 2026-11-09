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
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs leading-none font-semibold whitespace-nowrap",
  {
    variants: {
      status: {
        ok: "bg-primary-tint text-primary-ink",
        due_soon: "bg-info text-info-foreground",
        overdue: "bg-warning text-warning-foreground",
        never: "border border-dashed border-line-strong text-muted-foreground",
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
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
      <Check aria-hidden="true" className="size-4" strokeWidth={2.5} />
      <span className="sr-only">{t.recordedAria}</span>
    </span>
  );
}

/** Abitudine ancora da compilare oggi: cerchio tratteggiato al posto della spunta. */
export function PendingTick() {
  return (
    <span className="flex size-7 shrink-0 rounded-full border-2 border-dashed border-line-strong">
      <span className="sr-only">{t.pendingAria}</span>
    </span>
  );
}

const iconVariants = cva(
  "flex size-10 shrink-0 items-center justify-center rounded-xl",
  {
    variants: {
      kind: {
        circumference: "bg-primary-tint text-secondary-foreground",
        habit: "bg-habit text-secondary-foreground",
        workout: "bg-file-workout text-secondary-foreground",
      } satisfies Record<MetricKind, string>,
      late: {
        true: "bg-warning text-secondary-foreground",
        false: "",
      },
    },
    defaultVariants: { late: false },
  },
);

const cardVariants = cva("flex text-card-foreground", {
  variants: {
    layout: {
      /**
       * Riga dell'elenco del cliente (C8): tutta la riga porta al dettaglio.
       * Le righe stanno in un elenco raggruppato (`MetricRowList`).
       */
      row: "min-h-16 items-center gap-3 bg-card px-4 py-3",
      /** Card della scheda Tracking dello staff (A9). */
      panel: "flex-col gap-2.5 rounded-[14px] border bg-card p-4",
    },
    interactive: {
      true: "transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset",
      false: "",
    },
    late: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [{ layout: "panel", late: true, className: "border-warm" }],
  defaultVariants: { interactive: false, late: false },
});

/** Elenco raggruppato delle righe di `MetricCard` (C5, C8): un solo riquadro con i separatori. */
export function MetricRowList({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <ul
      aria-label={label}
      className="flex flex-col divide-y divide-muted overflow-hidden rounded-[14px] border bg-card"
    >
      {children}
    </ul>
  );
}

type MetricCardProps = {
  kind: MetricKind;
  layout: "row" | "panel";
  icon: string;
  title: string;
  /** Istruzione della misura o sottotitolo. */
  description?: string | null;
  /** Righe brevi sotto il titolo (registrazioni, ultima data…); nel pannello, pillola accanto al titolo. */
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
 * Usata nell'area cliente (C8, riga con icona) e nella scheda Tracking dello
 * staff (A9, pannello con titolo e stato).
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
  const late = status === "overdue";

  if (layout === "row") {
    const classes = cn(
      cardVariants({ layout, interactive: Boolean(href) }),
      className,
    );
    const content = (
      <>
        <span className={iconVariants({ kind, late })}>
          <MetricIcon name={icon} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="text-[15px] font-semibold">{title}</h3>
          {description ? (
            <p className="text-[12.5px] text-muted-foreground">{description}</p>
          ) : null}
          {meta ? (
            <div className="text-[12.5px] font-semibold">{meta}</div>
          ) : null}
        </div>
        {status && status !== "ok" ? (
          <MetricStatusBadge status={status} />
        ) : recorded ? (
          <RecordedTick />
        ) : kind === "habit" && recorded === false ? (
          <PendingTick />
        ) : null}
        {children}
      </>
    );
    return href ? (
      <Link href={href} className={classes}>
        {content}
      </Link>
    ) : (
      <article className={classes}>{content}</article>
    );
  }

  return (
    <article className={cn(cardVariants({ layout, late }), className)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-[15px] font-bold">
          {href ? (
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
        {status ? (
          <MetricStatusBadge status={status} />
        ) : meta ? (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs leading-none font-semibold whitespace-nowrap text-secondary-foreground">
            {meta}
          </span>
        ) : null}
      </div>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {children}
    </article>
  );
}
