import { cva } from "class-variance-authority";

import type { FileCategory } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";

const categoryTagVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      category: {
        diet: "bg-primary-tint text-primary-ink",
        workout: "bg-file-workout text-foreground",
        report: "bg-file-report text-foreground",
      } satisfies Record<FileCategory, string>,
    },
  },
);

/** Etichetta colorata della categoria di un file (Dieta, Allenamento, Report). */
export function CategoryTag({
  category,
  className,
}: {
  category: FileCategory;
  className?: string;
}) {
  return (
    <span className={cn(categoryTagVariants({ category }), className)}>
      {copy.domain.fileCategory[category]}
    </span>
  );
}
