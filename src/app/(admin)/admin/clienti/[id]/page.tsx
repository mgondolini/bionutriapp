import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageLoading } from "@/components/shared/page-states";
import { clientDetailPath } from "@/lib/constants/domain";

async function RedirectToProfile({
  params,
}: Pick<PageProps<"/admin/clienti/[id]">, "params">): Promise<null> {
  redirect(clientDetailPath((await params).id));
}

/** La scheda cliente si apre sul Profilo. */
export default function ClientDetailPage({
  params,
}: PageProps<"/admin/clienti/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <RedirectToProfile params={params} />
    </Suspense>
  );
}
