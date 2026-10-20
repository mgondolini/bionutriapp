import { HISTORY_LIMIT } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { measureHistory } from "@/lib/domain/tracking/circumferences";
import { measureText, scoreText } from "@/lib/domain/tracking/labels";
import type { MetricOverview } from "@/lib/domain/tracking/overview";
import {
  formatDayMonthLong,
  formatLongDate,
  formatSignedDelta,
  formatWeekdayShort,
} from "@/lib/format";
import type { MetricLimits } from "@/server/validation/tracking.schema";

import { DeleteEntryDialog } from "./delete-entry-dialog";
import { EditEntryDialog } from "./edit-entry-dialog";

const t = copy.client.tracking.history;
const tt = copy.tracking;

/** Riga secondaria: variazione (circonferenze), nota (allenamenti), giorno della settimana (abitudini). */
function detailFor(
  item: MetricOverview,
  row: { recordedOn: string; note: string | null; delta: number | null },
): string {
  switch (item.kind) {
    case "circumference":
      return row.delta === null
        ? tt.firstValue
        : formatSignedDelta(row.delta, item.metric.unit);
    case "workout":
      return row.note ?? tt.noNote;
    case "habit":
      return formatWeekdayShort(row.recordedOn);
  }
}

/**
 * Storico di una misura (C10, C11, C12, T-03): dalla più recente, con
 * correzione ed eliminazione solo se il cliente può scrivere (In percorso).
 */
export function EntryHistory({
  item,
  limits,
  today,
  canWrite,
}: {
  item: MetricOverview;
  limits: MetricLimits;
  today: string;
  canWrite: boolean;
}) {
  const rows = measureHistory(item.entries).slice(0, HISTORY_LIMIT);
  const title =
    item.kind === "circumference"
      ? t.title
      : item.kind === "workout"
        ? t.diaryTitle
        : t.daysTitle;
  return (
    <section aria-labelledby="entry-history" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="entry-history" className="text-sm font-semibold">
          {title}
        </h2>
        {canWrite && rows.length > 0 ? (
          <span className="text-xs text-muted-foreground">
            {item.kind === "circumference" ? t.editHint : t.editHintShort}
          </span>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tt.noEntries}</p>
      ) : (
        <ul className="flex flex-col divide-y rounded-xl border bg-card">
          {rows.map((row) => {
            const dateLabel = formatLongDate(row.recordedOn);
            const valueLabel =
              item.kind === "circumference"
                ? measureText(row.value, item.metric.unit)
                : scoreText(row.value, item.metric.maxValue);
            return (
              <li key={row.id} className="flex items-center gap-3 px-4 py-2">
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-medium">
                    {formatDayMonthLong(row.recordedOn)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {detailFor(item, row)}
                  </span>
                </div>
                <span className="font-semibold whitespace-nowrap tabular-nums">
                  {valueLabel}
                </span>
                {canWrite ? (
                  <div className="flex shrink-0">
                    <EditEntryDialog
                      kind={item.kind}
                      entry={{
                        id: row.id,
                        value: row.value,
                        recordedOn: row.recordedOn,
                        note: row.note,
                      }}
                      limits={limits}
                      today={today}
                      question={item.metric.instructions ?? item.metric.name}
                      dateLabel={dateLabel}
                    />
                    <DeleteEntryDialog
                      entryId={row.id}
                      dateLabel={dateLabel}
                      valueLabel={valueLabel}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {item.entries.length > HISTORY_LIMIT ? (
        <p className="text-xs text-muted-foreground">
          {t.limited(HISTORY_LIMIT)}
        </p>
      ) : null}
    </section>
  );
}
