import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";

import { PageLoading } from "@/components/shared/page-states";
import { NotesWorkspace } from "@/features/admin/client-notes/notes-workspace";
import { getStaffNotes } from "@/server/services/client-notes.service";
import { requireStaff } from "@/server/services/session.service";
import { clientIdSchema } from "@/server/validation/clients.schema";

/**
 * Una nota aperta nell'editor; sul telefono a tutto schermo. Una nota
 * inesistente, eliminata o di un altro cliente dà 404.
 */
async function NoteContent({
  params,
}: PageProps<"/admin/clienti/[id]/note/[noteId]">) {
  const session = await requireStaff();
  const { id, noteId } = await params;
  const client = clientIdSchema.safeParse(id);
  const note = z.uuid().safeParse(noteId);
  if (!client.success || !note.success || !session.studio.id) notFound();
  const data = await getStaffNotes(session.studio.id, client.data, note.data);
  if (!data?.selected) notFound();
  return (
    <NotesWorkspace
      clientId={client.data}
      data={{ ...data, selected: data.selected }}
      editorOpen
    />
  );
}

export default function ClientNotePage(
  props: PageProps<"/admin/clienti/[id]/note/[noteId]">,
) {
  return (
    <Suspense fallback={<PageLoading />}>
      <NoteContent {...props} />
    </Suspense>
  );
}
