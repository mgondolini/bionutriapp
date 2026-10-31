import { copy } from "@/lib/copy/it";
import { formatShortDateTime } from "@/lib/format";
import type { StageHistoryItem } from "@/server/services/clients.service";

import { ProfileSection } from "@/components/shared/profile-section";

const t = copy.admin.clients.profile.history;
const stageLabel = copy.domain.journeyStage;

/** Storico dei cambi di fase (ST-04): data, fase precedente e nuova, autore. */
export function StageHistory({ items }: { items: StageHistoryItem[] }) {
  return (
    <ProfileSection title={t.title}>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ol className="flex flex-col">
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
                className="relative flex flex-col gap-0.5 pb-[18px] pl-7 before:absolute before:top-1.5 before:left-[5px] before:size-2.5 before:rounded-full before:bg-primary after:absolute after:top-[18px] after:-bottom-1.5 after:left-[9px] after:w-0.5 after:bg-border last:pb-0 last:after:hidden"
              >
                <span className="text-sm font-semibold">
                  {t.transition(
                    item.from ? stageLabel[item.from] : t.created,
                    stageLabel[item.to],
                  )}
                </span>
                <span className="text-[13px] text-muted-foreground">
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
