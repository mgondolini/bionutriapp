import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Riquadro di un profilo (scheda cliente dello staff, profilo del cliente e del professionista) con titolo e azione facoltativa. */
export function ProfileSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const id = `profile-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section
      aria-labelledby={id}
      className={cn(
        "flex flex-col gap-4 rounded-[14px] border bg-card p-5 text-card-foreground sm:px-6 sm:py-[22px]",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-48 flex-1 flex-col gap-0.5">
          <h2 id={id} className="text-[17px] font-bold tracking-tight">
            {title}
          </h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Coppia etichetta / valore in una lista di definizioni. */
export function ProfileItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 text-sm sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 font-medium break-words">{children}</dd>
    </div>
  );
}
