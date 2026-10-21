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
        "flex flex-col gap-4 rounded-xl border bg-card p-5 text-card-foreground",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-48 flex-1 flex-col gap-0.5">
          <h2 id={id} className="text-base font-semibold">
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
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
