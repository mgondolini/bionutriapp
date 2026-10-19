import { cva } from "class-variance-authority";
import { FileText } from "lucide-react";
import type { ReactNode } from "react";

import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";

/** Badge di un file: non ancora letto dal cliente, in corso, da leggere (archivio). */
export type FileBadge = "new" | "current" | "toRead";

const BADGE_LABELS: Record<FileBadge, string> = {
  new: copy.files.newBadge,
  current: copy.files.currentBadge,
  toRead: copy.files.toRead,
};

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      badge: {
        new: "bg-primary text-primary-foreground",
        current: "bg-success text-success-foreground",
        toRead: "bg-warning text-warning-foreground",
      } satisfies Record<FileBadge, string>,
    },
  },
);

export function FileBadgeLabel({
  badge,
  className,
}: {
  badge: FileBadge;
  className?: string;
}) {
  return (
    <span className={cn(badgeVariants({ badge }), className)}>
      {BADGE_LABELS[badge]}
    </span>
  );
}

const cardVariants = cva("flex text-card-foreground", {
  variants: {
    variant: {
      /** File in evidenza: home (C5) e file in corso (C7). */
      featured: "flex-col gap-4 rounded-xl border bg-card p-5 shadow-xs",
      /** Riga compatta: archivio (C7) e scheda File su schermi stretti. */
      row: "flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3",
    },
  },
});

type FileCardProps = {
  variant: "featured" | "row";
  title: string;
  /** Riga sopra il titolo nella variante featured (es. categoria e data). */
  eyebrow?: string;
  /** Data, dimensione o altre informazioni sotto il titolo. */
  meta?: ReactNode;
  badge?: FileBadge | null;
  /** Nota del nutrizionista: testo semplice, mai interpretato come HTML. */
  note?: string | null;
  /** Pulsanti (apri, scarica, elimina): la card non conosce le azioni. */
  children?: ReactNode;
  className?: string;
};

/** Scheda di un file PDF, usata nell'area cliente e nella scheda File dello staff (DEV-02). */
export function FileCard({
  variant,
  title,
  eyebrow,
  meta,
  badge,
  note,
  children,
  className,
}: FileCardProps) {
  if (variant === "row") {
    return (
      <article className={cn(cardVariants({ variant }), className)}>
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <FileText aria-hidden="true" className="size-5" />
        </span>
        <div className="flex min-w-40 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="line-clamp-2 text-sm font-semibold break-words">
              {title}
            </h3>
            {badge ? <FileBadgeLabel badge={badge} /> : null}
          </div>
          {meta ? (
            <div className="text-xs text-muted-foreground">{meta}</div>
          ) : null}
        </div>
        {children ? (
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {children}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <article className={cn(cardVariants({ variant }), className)}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {badge ? <FileBadgeLabel badge={badge} /> : null}
        {eyebrow ? <span>{eyebrow}</span> : null}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg leading-snug font-semibold">{title}</h3>
        {meta ? (
          <div className="text-sm text-muted-foreground">{meta}</div>
        ) : null}
      </div>
      {note ? (
        <blockquote
          aria-label={copy.files.noteLabel}
          className="rounded-lg border-l-4 border-primary/60 bg-muted px-3 py-2 text-sm whitespace-pre-line"
        >
          {note}
        </blockquote>
      ) : null}
      {children ? (
        <div className="flex flex-wrap items-center gap-2">{children}</div>
      ) : null}
    </article>
  );
}
