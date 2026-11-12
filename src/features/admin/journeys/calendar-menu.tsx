"use client";

import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import { CalendarPlus, Download, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { copy } from "@/lib/copy/it";
import {
  googleCalendarUrl,
  outlookCalendarUrl,
  type CalendarEvent,
} from "@/lib/domain/journeys/calendar";
import { buildIcs } from "@/lib/domain/journeys/ics";

const t = copy.journeys;

const itemClassName =
  "flex min-h-11 w-full cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-left outline-none focus:bg-admin-hover data-highlighted:bg-admin-hover";

/** Scarica il file .ics costruito nel browser (nessuna richiesta al server). */
function downloadIcs(event: CalendarEvent, fileName: string) {
  const blob = new Blob([buildIcs(event, t.ics.meetLine)], {
    type: "text/calendar;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function ItemText({ label, hint }: { label: string; hint: string }) {
  return (
    <span className="flex flex-col">
      <span className="text-sm font-semibold">{label}</span>
      <span className="text-xs text-admin-muted">{hint}</span>
    </span>
  );
}

/**
 * "Aggiungi al calendario" dello staff (A17): evento di 30 minuti con il link
 * Meet della sessione (resolveMeetingUrl) e l'invito all'email del cliente,
 * in Google Calendar, Apple Calendar, Outlook o un altro calendario (.ics).
 */
export function CalendarMenu({
  event,
  summary,
  fileName,
}: {
  event: CalendarEvent;
  /** "11 gen 2027, 10:30 · 30 minuti · invito a Giulia". */
  summary: string;
  fileName: string;
}) {
  const options = t.calendarOptions;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="neutral" />}>
        <CalendarPlus aria-hidden="true" />
        {t.admin.calendar}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-0.5 px-2.5 py-2">
            <span className="text-sm font-bold text-foreground">
              {event.title}
            </span>
            <span className="text-xs text-admin-muted">{summary}</span>
          </DropdownMenuLabel>
          <MenuPrimitive.LinkItem
            closeOnClick
            render={
              <a
                href={googleCalendarUrl(event, t.ics.meetLine)}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            className={itemClassName}
          >
            <ExternalLink aria-hidden="true" className="mt-0.5 size-4" />
            <ItemText label={options.google.label} hint={options.google.hint} />
          </MenuPrimitive.LinkItem>
          <DropdownMenuItem
            onClick={() => downloadIcs(event, fileName)}
            className={itemClassName}
          >
            <Download aria-hidden="true" className="mt-0.5 size-4" />
            <ItemText label={options.apple.label} hint={options.apple.hint} />
          </DropdownMenuItem>
          <MenuPrimitive.LinkItem
            closeOnClick
            render={
              <a
                href={outlookCalendarUrl(event, t.ics.meetLine)}
                target="_blank"
                rel="noopener noreferrer"
              />
            }
            className={itemClassName}
          >
            <ExternalLink aria-hidden="true" className="mt-0.5 size-4" />
            <ItemText
              label={options.outlook.label}
              hint={options.outlook.hint}
            />
          </MenuPrimitive.LinkItem>
          <DropdownMenuItem
            onClick={() => downloadIcs(event, fileName)}
            className={itemClassName}
          >
            <Download aria-hidden="true" className="mt-0.5 size-4" />
            <ItemText label={options.other.label} hint={options.other.hint} />
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
