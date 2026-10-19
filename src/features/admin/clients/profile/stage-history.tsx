import { copy } from "@/lib/copy/it";
import { formatShortDateTime } from "@/lib/format";
import type { StageHistoryItem } from "@/server/services/clients.service";

import { ProfileSection } from "./profile-section";

const t = copy.admin.clients.profile.history;
const stageLabel = copy.domain.journeyStage;

/** Storico dei cambi di fase (ST-04): data, fase precedente e nuova, autore. */
export function StageHistory({ items }: { items: StageHistoryItem[] }) {
  return (
    <ProfileSection title={t.title}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((item) => {
            const author =
              item.source === "automatic"
                ? t.automatic
                : item.authorName
                  ? t.manual(item.authorName)
                  : t.manualUnknown;
            return (
              <li
                key={item.id}
                className="flex flex-col gap-0.5 border-l-2 border-primary/40 pl-3"
              >
                <span className="text-sm font-medium">
                  {t.transition(
                    item.from ? stageLabel[item.from] : t.created,
                    stageLabel[item.to],
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t.meta(formatShortDateTime(item.changedAt), author)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </ProfileSection>
  );
}
