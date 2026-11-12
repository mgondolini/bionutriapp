import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageLoading } from "@/components/shared/page-states";
import { ClientDetailHeader } from "@/features/admin/clients/client-detail-header";
import { ClientTabs } from "@/features/admin/clients/client-tabs";
import { copy } from "@/lib/copy/it";
import { getClientHeader } from "@/server/services/clients.service";
import { getStaffOpenPhotoSets } from "@/server/services/photos.service";
import { requireStaff } from "@/server/services/session.service";
import { clientIdSchema } from "@/server/validation/clients.schema";

/**
 * Scheda cliente (A4): intestazione e schede Profilo, Percorso, File,
 * Tracking, Foto (con i set da completare), Note cliniche.
 * Un id non valido, inesistente o di un altro studio (nascosto dalla RLS) dà 404.
 */
async function ClientDetailShell({
  params,
  children,
}: Pick<LayoutProps<"/admin/clienti/[id]">, "params" | "children">) {
  await requireStaff();
  const parsed = clientIdSchema.safeParse((await params).id);
  if (!parsed.success) notFound();
  const client = await getClientHeader(parsed.data);
  if (!client) notFound();
  const openPhotoSets = await getStaffOpenPhotoSets(client.id);

  return (
    <div className="flex flex-col gap-6">
      {/* sul telefono una nota aperta occupa lo schermo (Note cliniche) */}
      <div className="contents max-lg:[body:has([data-note-fullscreen])_&]:hidden">
        <ClientDetailHeader client={client} />
        <ClientTabs
          clientId={client.id}
          badges={
            openPhotoSets > 0
              ? { foto: copy.photos.admin.tabBadge(openPhotoSets) }
              : undefined
          }
        />
      </div>
      {children}
    </div>
  );
}

export default function ClientDetailLayout({
  params,
  children,
}: LayoutProps<"/admin/clienti/[id]">) {
  return (
    <Suspense fallback={<PageLoading />}>
      <ClientDetailShell params={params}>{children}</ClientDetailShell>
    </Suspense>
  );
}
