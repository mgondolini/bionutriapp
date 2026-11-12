import { notFound } from "next/navigation";
import { Suspense } from "react";

import { PageLoading } from "@/components/shared/page-states";
import { NotesWorkspace } from "@/features/admin/client-notes/notes-workspace";
import { getStaffNotes } from "@/server/services/client-notes.service";
import { requireStaff } from "@/server/services/session.service";
import { clientIdSchema } from "@/server/validation/clients.schema";

/**
 * Note cliniche: elenco dei documenti; su desktop accanto c'è l'anamnesi
 * aperta. Solo staff: il cliente non vede mai queste note.
 */
async function NotesContent({ params }: PageProps<"/admin/clienti/[id]/note">) {
  const session = await requireStaff();
  const parsed = clientIdSchema.safeParse((await params).id);
  if (!parsed.success || !session.studio.id) notFound();
  const data = await getStaffNotes(session.studio.id, parsed.data);
  if (!data?.selected) notFound();
  return (
    <NotesWorkspace
      clientId={parsed.data}
      data={{ ...data, selected: data.selected }}
      editorOpen={false}
    />
  );
}

export default function ClientNotesPage(
  props: PageProps<"/admin/clienti/[id]/note">,
) {
  return (
    <Suspense fallback={<PageLoading />}>
      <NotesContent {...props} />
    </Suspense>
  );
}
