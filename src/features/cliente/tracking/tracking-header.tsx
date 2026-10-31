import type { ReactNode } from "react";

import { ClientPageHeader } from "@/features/cliente/client-header";
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
    <ClientPageHeader
      title={title}
      badge={badge}
      backHref={ROUTES.client.tracking}
      backLabel={copy.client.tracking.backAria}
    />
  );
}
