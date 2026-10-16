import { SearchX, Users } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { PageLoading } from "@/components/shared/page-states";
import { buttonVariants } from "@/components/ui/button";
import { ClientsCards } from "@/features/admin/clients/clients-cards";
import { ClientsTable } from "@/features/admin/clients/clients-table";
import { ClientsToolbar } from "@/features/admin/clients/clients-toolbar";
import { ImportCsvDialog } from "@/features/admin/clients/import-csv-dialog";
import { NewClientDialog } from "@/features/admin/clients/new-client-dialog";
import { ROUTES } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { getClientList } from "@/server/services/clients.service";
import { requireStaff } from "@/server/services/session.service";
import { clientListParamsSchema } from "@/server/validation/clients.schema";

const t = copy.admin.clients;

/** Filtri e ricerca arrivano dall'URL: dato della richiesta, quindi dietro Suspense. */
async function ClientsList({
  searchParams,
}: Pick<PageProps<"/admin/clienti">, "searchParams">) {
  const session = await requireStaff();
  const filters = clientListParamsSchema.parse(await searchParams);
  const { items, counts, total } = await getClientList(
    session.studio.id!,
    filters,
  );

  if (total === 0) {
    return (
      <EmptyState
        icon={Users}
        title={t.emptyTitle}
        description={t.emptyDescription}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ClientsToolbar filters={filters} counts={counts} />
      {items.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={t.noResultsTitle}
          description={t.noResultsDescription}
          action={
            <Link
              href={ROUTES.admin.clients}
              className={buttonVariants({ variant: "outline" })}
            >
              {t.resetFilters}
            </Link>
          }
        />
      ) : (
        <>
          <ClientsTable items={items} />
          <ClientsCards items={items} />
        </>
      )}
    </div>
  );
}

/** Elenco clienti (A-01…A-05, schermata A1). */
export default function ClientsPage({
  searchParams,
}: PageProps<"/admin/clienti">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t.title}
        description={t.description}
        actions={
          <div className="flex flex-wrap gap-2">
            <ImportCsvDialog />
            <NewClientDialog />
          </div>
        }
      />
      <Suspense fallback={<PageLoading />}>
        <ClientsList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
