import { Video } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { CalendarSheet } from "@/features/cliente/journeys/calendar-sheet";
import { copy } from "@/lib/copy/it";
import { cn } from "@/lib/utils";
import type { ClientSessionView } from "@/server/services/journeys.service";

/**
 * Sotto "Chiamata di onboarding" nella home (C4): gli stessi comandi del
 * prossimo check nella pagina Percorso (C19). "Partecipa su Google Meet"
 * compare appena lo studio salva il link della sessione.
 */
export function OnboardingCallActions({
  session,
  studioName,
}: {
  session: ClientSessionView;
  studioName: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      {session.meetingUrl ? (
        <a
          href={session.meetingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants(), "w-full")}
        >
          <Video aria-hidden="true" />
          {copy.journeys.client.joinMeet}
        </a>
      ) : null}
      <CalendarSheet session={session} studioName={studioName} />
    </div>
  );
}
