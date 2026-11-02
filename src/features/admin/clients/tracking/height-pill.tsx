import Link from "next/link";

import { clientDetailPath } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

const t = copy.admin.clients.tracking.height;

/**
 * Altezza del cliente accanto a peso e circonferenze (scheda Tracking e
 * dettaglio della misura): dà un'idea delle dimensioni della persona. Se
 * manca, porta alla scheda Profilo dove lo staff la inserisce.
 */
export function HeightPill({
  clientId,
  heightCm,
}: {
  clientId: string;
  heightCm: number | null;
}) {
  if (heightCm === null) {
    return (
      <Link
        href={clientDetailPath(clientId, "profilo")}
        className="inline-flex min-h-7 items-center rounded-full border border-dashed border-line-strong px-2.5 text-xs font-semibold whitespace-nowrap text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {t.missing}
      </Link>
    );
  }
  return (
    <span className="inline-flex min-h-7 items-center rounded-full bg-muted px-2.5 text-xs font-semibold whitespace-nowrap text-secondary-foreground">
      {t.value(copy.common.height.value(heightCm))}
    </span>
  );
}
