import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[26px] leading-tight font-bold tracking-tight sm:text-[30px]">
          {title}
        </h1>
        {description ? (
          <p className="text-[15px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions}
    </header>
  );
}
