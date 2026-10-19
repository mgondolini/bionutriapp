import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Riquadro della scheda Profilo con titolo e azione facoltativa. */
export function ProfileSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
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
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-base font-semibold">
          {title}
        </h2>
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
