import { notFound } from "next/navigation";
import { z } from "zod";

import { PdfViewer } from "@/components/shared/pdf-viewer/pdf-viewer";
import { requireClient } from "@/server/services/session.service";

/**
 * Visualizzatore di un PDF del cliente (react-pdf): link interni e link
 * esterni funzionano su ogni telefono. Bloccato in Onboarding (C-09); il
 * file e i permessi li controlla la Server Action openFile.
 */
export default async function ClientFileViewerPage({
  params,
}: PageProps<"/app/file/[fileId]">) {
  await requireClient({ unlocked: true });
  const { fileId } = await params;
  if (!z.uuid().safeParse(fileId).success) notFound();
  return <PdfViewer fileId={fileId} area="client" />;
}
