import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

/**
 * Riquadro comune delle pagine di autenticazione e attivazione (C1, C2):
 * sul telefono il contenuto sta direttamente sullo sfondo, da `sm` in una card.
 */
export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <section className="flex flex-col gap-6 sm:rounded-[14px] sm:border sm:bg-card sm:p-7">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-[26px] leading-tight font-bold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
