"use client";

import { CalendarPlus, Download, ExternalLink } from "lucide-react";
import { useState } from "react";

import { ResponsiveDialog } from "@/components/shared/responsive-dialog";
import { Button } from "@/components/ui/button";
import { journeyIcsPath } from "@/lib/constants/domain";
import { copy } from "@/lib/copy/it";
import {
  eventEnd,
  googleCalendarUrl,
  outlookCalendarUrl,
  type CalendarEvent,
} from "@/lib/domain/journeys/calendar";
import { sessionLabel } from "@/lib/domain/journeys/labels";
import { formatLongDate } from "@/lib/format";
import { readDevice } from "@/lib/pwa/push-client";
import type { ClientSessionView } from "@/server/services/journeys.service";

const t = copy.journeys;

type OptionKey = keyof typeof t.calendarOptions;

const rowClassName =
  "flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";

/**
 * "Aggiungi al calendario" del cliente (C22): foglio dal basso sul telefono.
 * Su iPhone la prima voce è Apple Calendar, altrove Google Calendar. Evento di
 * 30 minuti con il nome dello studio e il link Meet del prossimo check,
 * senza invitati. Apple e "Altro calendario" scaricano il file .ics.
 */
export function CalendarSheet({
  session,
  studioName,
}: {
  session: ClientSessionView;
  studioName: string;
}) {
  const [open, setOpen] = useState(false);
  const [appleFirst, setAppleFirst] = useState(false);
  const name = sessionLabel(session.name);
  const event: CalendarEvent = {
    uid: `${session.id}@nutrify`,
    title: t.ics.title(name, studioName),
    description: t.ics.description,
    date: session.date,
    time: session.time,
    meetingUrl: session.meetingUrl,
  };
  const when = t.ics.when(
    formatLongDate(session.date),
    session.time
      ? t.timeRange(session.time, eventEnd(session.date, session.time).time)
      : null,
  );
  const order: OptionKey[] = appleFirst
    ? ["apple", "google", "outlook", "other"]
    : ["google", "apple", "outlook", "other"];

  const onOpenChange = (next: boolean) => {
    // il dispositivo si legge solo all'apertura: nessuna differenza fra server e browser
    if (next) setAppleFirst(readDevice().platform === "ios");
    setOpen(next);
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        <Button type="button" variant="outline" className="w-full">
          <CalendarPlus aria-hidden="true" />
          {t.client.addToCalendar}
        </Button>
      }
      title={t.client.addToCalendar}
      description={t.client.calendarSheet.description(
        name,
        studioName,
        when,
        session.meetingUrl !== null,
      )}
    >
      <div className="flex flex-col gap-4 pt-2">
        <ul className="flex flex-col gap-1">
          {order.map((key) => {
            const option = t.calendarOptions[key];
            const hint =
              key === "apple" ? t.client.calendarSheet.appleHint : option.hint;
            const download = key === "apple" || key === "other";
            const href =
              key === "google"
                ? googleCalendarUrl(event, t.ics.meetLine)
                : key === "outlook"
                  ? outlookCalendarUrl(event, t.ics.meetLine)
                  : journeyIcsPath(session.id);
            const Icon = download ? Download : ExternalLink;
            return (
              <li key={key}>
                <a
                  href={href}
                  {...(download
                    ? { download: true }
                    : { target: "_blank", rel: "noopener noreferrer" })}
                  onClick={() => setOpen(false)}
                  className={rowClassName}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-tint">
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[15px] font-bold">
                      {option.label}
                    </span>
                    <span className="text-[13px] text-muted-foreground">
                      {hint}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
        <p className="text-[13px] text-muted-foreground">
          {t.client.calendarSheet.dateChangeNote}
        </p>
        <p className="text-[13px] text-muted-foreground">
          {t.client.calendarSheet.inviteNote}
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setOpen(false)}
        >
          {t.client.calendarSheet.cancel}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
