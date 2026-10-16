import { UserX } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/shared/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";

const t = copy.admin.clients.detail;

/** Cliente inesistente o di un altro studio. */
export default function ClientNotFound() {
  return (
    <EmptyState
      icon={UserX}
      title={t.notFoundTitle}
      description={t.notFoundDescription}
      action={
        <Link
          href={ROUTES.admin.clients}
          className={buttonVariants({ variant: "outline" })}
        >
          {t.backToList}
        </Link>
      }
    />
  );
}
