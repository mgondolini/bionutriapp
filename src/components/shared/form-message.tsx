import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const formMessageVariants = cva("rounded-lg px-3 py-2 text-sm", {
  variants: {
    tone: {
      error: "bg-destructive/10 text-destructive",
      info: "bg-info text-info-foreground",
    },
  },
  defaultVariants: { tone: "error" },
});

/** Messaggio a livello di form (errore generico o conferma), annunciato agli screen reader. */
export function FormMessage({
  children,
  tone,
  className,
}: { children: string; className?: string } & VariantProps<
  typeof formMessageVariants
>) {
  return (
    <p
      role={tone === "info" ? "status" : "alert"}
      className={cn(formMessageVariants({ tone }), className)}
    >
      {children}
    </p>
  );
}
