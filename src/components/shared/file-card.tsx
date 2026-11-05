import { cva } from "class-variance-authority";
import { FileText } from "lucide-react";
import type { ReactNode } from "react";

import type { FileCategory } from "@/lib/constants/domain";
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
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs leading-none font-semibold whitespace-nowrap",
  {
    variants: {
      badge: {
        new: "",
        current: "bg-primary-tint text-primary-ink",
        toRead: "",
      } satisfies Record<FileBadge, string>,
      category: {
        diet: "",
        workout: "",
        report: "",
      } satisfies Record<FileCategory, string>,
    },
    // "Nuovo" e "Da leggere" nel colore intenso della categoria
    compoundVariants: [
      {
        badge: ["new", "toRead"],
        category: "diet",
        className: "bg-mint text-mint-foreground",
      },
      {
        badge: ["new", "toRead"],
        category: "workout",
        className: "bg-file-workout-strong text-foreground",
      },
      {
        badge: ["new", "toRead"],
        category: "report",
        className: "bg-file-report-strong text-foreground",
      },
    ],
    defaultVariants: { category: "diet" },
  },
);

export function FileBadgeLabel({
  badge,
  category,
  className,
}: {
  badge: FileBadge;
  category?: FileCategory;
  className?: string;
}) {
  return (
    <span className={cn(badgeVariants({ badge, category }), className)}>
      {BADGE_LABELS[badge]}
    </span>
  );
}

const cardVariants = cva("flex text-card-foreground", {
  variants: {
    variant: {
      /** File in evidenza nel colore intenso della categoria: home (C5) e file in corso (C7). */
      featured: "flex-col gap-3 rounded-[18px] p-5 text-mint-foreground",
      /** Riga compatta: archivio (C7, in un elenco raggruppato) e scheda File su schermi stretti. */
      row: "min-h-16 flex-wrap items-center gap-3 bg-card px-4 py-3",
    },
  },
});

/** Colori della categoria: Diete sulla menta dello studio, Allenamenti azzurro, Report giallo. */
const CATEGORY_TONES: Record<
  FileCategory,
  { surface: string; pill: string; tile: string }
> = {
  diet: {
    surface: "bg-mint",
    pill: "text-mint",
    tile: "bg-primary-tint text-primary-ink",
  },
  workout: {
    surface: "bg-file-workout-strong",
    pill: "text-file-workout-strong",
    tile: "bg-file-workout text-secondary-foreground",
  },
  report: {
    surface: "bg-file-report-strong",
    pill: "text-file-report-strong",
    tile: "bg-file-report text-secondary-foreground",
  },
};

type FileCardProps = {
  variant: "featured" | "row";
  /** Categoria del file: decide i colori (predefinita: dieta, sulla menta). */
  category?: FileCategory;
  title: string;
  /** Riga sopra il titolo nella variante featured (es. la categoria). */
  eyebrow?: string;
  /** Data, dimensione o altre informazioni: sotto il titolo nella riga, a destra in alto nella variante featured. */
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
  category = "diet",
  title,
  eyebrow,
  meta,
  badge,
  note,
  children,
  className,
}: FileCardProps) {
  const tone = CATEGORY_TONES[category];
  if (variant === "row") {
    return (
      <article className={cn(cardVariants({ variant }), className)}>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            tone.tile,
          )}
        >
          <FileText aria-hidden="true" className="size-5" />
        </span>
        <div className="flex min-w-40 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="line-clamp-2 text-[15px] font-semibold break-words">
              {title}
            </h3>
            {badge ? (
              <FileBadgeLabel badge={badge} category={category} />
            ) : null}
          </div>
          {meta ? (
            <div className="text-[12.5px] text-muted-foreground">{meta}</div>
          ) : null}
        </div>
        {children ? (
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {children}
          </div>
        ) : null}
      </article>
    );
  }

  return (
    <article className={cn(cardVariants({ variant }), tone.surface, className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
        <span className="flex flex-wrap items-center gap-2 font-bold">
          {badge ? (
            <span
              className={cn(
                "rounded-full bg-mint-foreground px-2.5 py-1 leading-none",
                tone.pill,
              )}
            >
              {BADGE_LABELS[badge]}
            </span>
          ) : null}
          {eyebrow}
        </span>
        {meta ? <span>{meta}</span> : null}
      </div>
      <h3 className="text-[21px] leading-tight font-bold tracking-tight">
        {title}
      </h3>
      {note ? (
        <blockquote
          aria-label={copy.files.noteLabel}
          className="rounded-xl bg-white/60 px-3.5 py-3 text-sm leading-normal whitespace-pre-line"
        >
          {note}
        </blockquote>
      ) : null}
      {children ? (
        <div className="grid grid-cols-2 gap-2.5 *:h-12 *:rounded-xl">
          {children}
        </div>
      ) : null}
    </article>
  );
}
