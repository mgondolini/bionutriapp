import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageLoading } from "@/components/shared/page-states";
import { ClientProfile } from "@/features/admin/clients/profile/client-profile";
import { getClientProfile } from "@/server/services/clients.service";
import { requireStaff } from "@/server/services/session.service";
import { clientIdSchema } from "@/server/validation/clients.schema";

/** Scheda Profilo (A-06, A-07, ST-04): lettura tramite service, modifiche con Server Actions. */
async function ProfileContent({
  params,
}: Pick<PageProps<"/admin/clienti/[id]/profilo">, "params">) {
  const session = await requireStaff();
  const parsed = clientIdSchema.safeParse((await params).id);
  if (!parsed.success || !session.studio.id) notFound();
  const client = await getClientProfile(session.studio.id, parsed.data);
  if (!client) notFound();
  return <ClientProfile client={client} studioName={session.studio.name} />;
}

export default function ClientProfiloPage({
  params,
}: PageProps<"/admin/clienti/[id]/profilo">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <ProfileContent params={params} />
    </Suspense>
  );
}
