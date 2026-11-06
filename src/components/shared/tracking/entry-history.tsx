import { StatusBadge } from "@/components/shared/status-badge";
import { HISTORY_PAGE_SIZE } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import { measureHistory } from "@/lib/domain/tracking/circumferences";
import {
  entryAuthorBadge,
  measureText,
  scoreText,
} from "@/lib/domain/tracking/labels";
import type { MetricOverview } from "@/lib/domain/tracking/overview";
import {
  canEditEntry,
  type EntryViewer,
} from "@/lib/domain/tracking/permissions";
import {
  formatDayMonthLong,
  formatLongDate,
  formatSignedDelta,
  formatWeekdayShort,
} from "@/lib/format";
import type { MetricLimits } from "@/server/validation/tracking.schema";

import { PagedList } from "../paged-list";
import { DeleteEntryDialog } from "./delete-entry-dialog";
import { EditEntryDialog } from "./edit-entry-dialog";

const t = copy.tracking.history;
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
 * Storico di una misura nelle due aree (C10, C11, C12, A10, A11): righe
 * impilate dalla più recente, 10 per pagina con le frecce, leggibili anche a
 * 375 px (A-17). L'etichetta
 * dell'autore (A-16) e i pulsanti di correzione ed eliminazione per riga
 * seguono canEditEntry: lo staff tutto, il cliente In percorso solo ciò che
 * ha inserito lui (T-03). `clientId` solo nell'area admin.
 */
export function EntryHistory({
  item,
  limits,
  today,
  viewer,
  clientId,
}: {
  item: MetricOverview;
  limits: MetricLimits;
  today: string;
  viewer: EntryViewer;
  clientId?: string;
}) {
  const rows = measureHistory(item.entries);
  const anyEditable = rows.some((row) => canEditEntry(row, viewer));
  const title =
    item.kind === "circumference"
      ? t.title
      : item.kind === "workout"
        ? t.diaryTitle
        : t.daysTitle;
  return (
    <section aria-labelledby="entry-history" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="entry-history" className="text-lg font-bold">
          {title}
        </h2>
        {anyEditable ? (
          <span className="text-[13px] text-muted-foreground">
            {item.kind === "circumference" ? t.editHint : t.editHintShort}
          </span>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tt.noEntries}</p>
      ) : (
        <PagedList
          pageSize={HISTORY_PAGE_SIZE}
          className="flex flex-col divide-y divide-muted rounded-[14px] border bg-card"
          items={rows.map((row) => {
            const dateLabel = formatLongDate(row.recordedOn);
            const valueLabel =
              item.kind === "circumference"
                ? measureText(row.value, item.metric.unit)
                : scoreText(row.value, item.metric.maxValue);
            const badge = entryAuthorBadge(row);
            return (
              <li
                key={row.id}
                className="flex min-h-14 items-center gap-3 py-2 pr-2 pl-4"
                data-testid="entry-row"
              >
                <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                  <span className="text-sm">
                    {formatDayMonthLong(row.recordedOn)}
                  </span>
                  <span className="max-w-full truncate text-[12.5px] text-muted-foreground">
                    {detailFor(item, row)}
                  </span>
                  {badge ? <StatusBadge status={badge} /> : null}
                </div>
                <span className="text-[15px] font-bold whitespace-nowrap tabular-nums">
                  {valueLabel}
                </span>
                {canEditEntry(row, viewer) ? (
                  <div className="flex shrink-0">
                    <EditEntryDialog
                      kind={item.kind}
                      clientId={clientId}
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
                      clientId={clientId}
                      dateLabel={dateLabel}
                      valueLabel={valueLabel}
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        />
      )}
    </section>
  );
}
