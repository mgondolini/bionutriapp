import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { PageLoading } from "@/components/shared/page-states";
import { PdfViewer } from "@/components/shared/pdf-viewer/pdf-viewer";
import { requireStaff } from "@/server/services/session.service";

async function Viewer({ params }: PageProps<"/admin/file/[fileId]">) {
  await requireStaff();
  const { fileId } = await params;
  if (!z.uuid().safeParse(fileId).success) notFound();
  return (
    <div className="mx-auto w-full max-w-4xl">
      <PdfViewer fileId={fileId} area="admin" />
    </div>
  );
}

/**
 * Visualizzatore di un PDF di un cliente per lo staff (react-pdf). Il file e
 * lo studio li controlla la Server Action openFile.
 */
export default function AdminFileViewerPage(
  props: PageProps<"/admin/file/[fileId]">,
) {
  return (
    <Suspense fallback={<PageLoading />}>
      <Viewer {...props} />
    </Suspense>
  );
}
