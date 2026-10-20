import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

/** Intestazione delle pagine interne del tracking, con il ritorno all'elenco. */
export function TrackingHeader({
  title,
  badge,
}: {
  title: string;
  badge?: ReactNode;
}) {
  return (
    <header className="flex items-center gap-2">
      <Link
        href={ROUTES.client.tracking}
        aria-label={copy.client.tracking.backAria}
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <ArrowLeft aria-hidden="true" />
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {badge}
    </header>
  );
}
