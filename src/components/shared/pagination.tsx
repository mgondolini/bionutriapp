import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { copy } from "@/lib/copy/it";
import type { Page } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const t = copy.pagination;

/** Destinazione di una freccia: un link (pagina nell'URL) o un'azione nel browser. */
export type PageTarget = { href: string } | { onClick: () => void };

function Arrow({
  direction,
  target,
}: {
  direction: "previous" | "next";
  target: PageTarget | null;
}) {
  const Icon = direction === "previous" ? ChevronLeft : ChevronRight;
  const label = direction === "previous" ? t.previous : t.next;
  const icon = <Icon aria-hidden="true" />;
  if (target && "href" in target) {
    return (
      <Link
        href={target.href}
        scroll={false}
        aria-label={label}
        className={buttonVariants({ variant: "outline", size: "icon" })}
      >
        {icon}
      </Link>
    );
  }
  // al limite resta focalizzabile (aria-disabled): il focus non salta via
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      aria-label={label}
      aria-disabled={!target || undefined}
      onClick={target?.onClick}
      className={cn(!target && "cursor-default opacity-50 hover:bg-card")}
    >
      {icon}
    </Button>
  );
}

/**
 * Frecce di una lista paginata con "21–40 di 45" (elenco clienti, storico
 * delle misure). Non compare se c'è una sola pagina. Il testo è annunciato
 * dai lettori di schermo quando cambia pagina senza ricaricare.
 */
export function Pagination({
  page,
  previous,
  next,
  className,
}: {
  page: Pick<Page<unknown>, "from" | "to" | "total" | "pageCount">;
  previous: PageTarget | null;
  next: PageTarget | null;
  className?: string;
}) {
  if (page.pageCount <= 1) return null;
  return (
    <nav
      aria-label={t.label}
      className={cn("flex items-center justify-end gap-3", className)}
    >
      <p
        aria-live="polite"
        className="text-[13px] text-muted-foreground tabular-nums"
      >
        {t.summary(page.from, page.to, page.total)}
      </p>
      <div className="flex gap-2">
        <Arrow direction="previous" target={previous} />
        <Arrow direction="next" target={next} />
      </div>
    </nav>
  );
}
