import { cn } from "@/lib/utils";
import type { StaffNotes } from "@/server/services/client-notes.service";

import { NoteEditor } from "./note-editor";
import { NotesList } from "./notes-list";

/**
 * Scheda Note cliniche: su desktop elenco (300 px) ed editor affiancati;
 * sul telefono due schermate, l'elenco (`/note`) e l'editor a tutto
 * schermo (`/note/[noteId]`, `editorOpen`).
 */
export function NotesWorkspace({
  clientId,
  data,
  editorOpen,
}: {
  clientId: string;
  data: StaffNotes & { selected: NonNullable<StaffNotes["selected"]> };
  editorOpen: boolean;
}) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      <div className={cn("lg:w-[300px] lg:shrink-0", editorOpen && "max-lg:hidden")}>
        <NotesList
          clientId={clientId}
          notes={data.notes}
          selectedId={data.selected.id}
        />
      </div>
      <div className={cn("min-w-0 flex-1", !editorOpen && "max-lg:hidden")}>
        <NoteEditor
          key={data.selected.id}
          note={data.selected}
          clientId={clientId}
          fullscreen={editorOpen}
        />
      </div>
    </div>
  );
}
