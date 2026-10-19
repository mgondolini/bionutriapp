import { Dumbbell } from "lucide-react";

import { CategoryFiles } from "@/features/cliente/files/category-files";
import { copy } from "@/lib/copy/it";
import { dayInRome } from "@/lib/format";
import { getClientCategoryFiles } from "@/server/services/files.service";
import { requireClient } from "@/server/services/session.service";

const t = copy.client.sections.workouts;

/** File in corso e archivio della categoria (C-04); bloccata in Onboarding (C-09). */
export default async function WorkoutsPage() {
  const { client, studio } = await requireClient({ unlocked: true });
  const { current, archive } = await getClientCategoryFiles(
    client.id,
    "workout",
  );
  return (
    <CategoryFiles
      title={t.title}
      subtitle={t.subtitle(studio.name)}
      emptyIcon={Dumbbell}
      emptyTitle={t.emptyTitle}
      emptyDescription={t.emptyDescription}
      current={current}
      archive={archive}
      today={dayInRome()}
    />
  );
}
