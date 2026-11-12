import { z } from "zod";

import { copy } from "@/lib/copy/it";
import { sessionMinutes } from "@/lib/domain/journeys/calendar";
import { buildIcs } from "@/lib/domain/journeys/ics";
import { sessionLabel } from "@/lib/domain/journeys/labels";
import { getOwnSession } from "@/server/services/journeys.service";
import { getSession } from "@/server/services/session.service";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * "Aggiungi al calendario" (C19, C22: Apple Calendar e "Altro calendario"):
 * file .ics di una sessione del cliente
 * della sessione. Le sessioni si leggono solo da my_journey_sessions, quindi
 * un id di un altro cliente (o di un altro studio) dà 404 come uno inesistente.
 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/app/percorso/sessioni/[id]/calendario">,
) {
  const session = await getSession();
  if (session.kind !== "client") {
    return new Response(null, { status: 401, headers: NO_STORE });
  }
  const parsed = z.uuid().safeParse((await params).id);
  if (!parsed.success) {
    return new Response(null, { status: 404, headers: NO_STORE });
  }
  const journeySession = await getOwnSession(parsed.data);
  if (!journeySession) {
    return new Response(null, { status: 404, headers: NO_STORE });
  }

  const name = sessionLabel(journeySession.name);
  const ics = buildIcs(
    {
      uid: `${journeySession.id}@nutrify`,
      title: copy.journeys.ics.title(name, session.studio.name),
      description: copy.journeys.ics.description,
      date: journeySession.date,
      time: journeySession.time,
      durationMinutes: sessionMinutes(journeySession.type),
      // già scelto da resolveMeetingUrl, solo per il prossimo check
      meetingUrl: journeySession.meetingUrl,
    },
    copy.journeys.ics.meetLine,
  );
  return new Response(ics, {
    headers: {
      ...NO_STORE,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${copy.journeys.ics.fileName(name)}"`,
    },
  });
}
