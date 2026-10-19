import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageLoading } from "@/components/shared/page-states";
import { ClientFilesList } from "@/features/admin/clients/files/client-files-list";
import { FileUploadForm } from "@/features/admin/clients/files/file-upload-form";
import { FILE_LIST_PARAMS } from "@/lib/constants/domain";
import { getStaffFiles } from "@/server/services/files.service";
import { requireStaff } from "@/server/services/session.service";
import { clientIdSchema } from "@/server/validation/clients.schema";
import { fileCategoryParamSchema } from "@/server/validation/files.schema";

/** Scheda File (A-08…A-11): caricamento ed elenco; lettura tramite service, modifiche con Server Actions. */
async function FilesContent({
  params,
  searchParams,
}: PageProps<"/admin/clienti/[id]/file">) {
  const session = await requireStaff();
  const parsed = clientIdSchema.safeParse((await params).id);
  if (!parsed.success || !session.studio.id) notFound();
  const data = await getStaffFiles(session.studio.id, parsed.data);
  if (!data) notFound();

  const raw = (await searchParams)[FILE_LIST_PARAMS.category];
  const category = fileCategoryParamSchema.parse(
    typeof raw === "string" ? raw : null,
  );

  return (
    <div className="flex flex-col gap-6">
      <FileUploadForm clientId={data.clientId} />
      <ClientFilesList
        clientId={data.clientId}
        clientName={data.clientName}
        files={data.files}
        category={category}
      />
    </div>
  );
}

export default function ClientFilePage(
  props: PageProps<"/admin/clienti/[id]/file">,
) {
  return (
    <Suspense fallback={<PageLoading />}>
      <FilesContent {...props} />
    </Suspense>
  );
}
