import { describe, expect, it } from "vitest";

import {
  badgeUrl,
  buildNotification,
  dedupeKey,
  logPayload,
  notificationTtl,
  type NotificationEvent,
} from "./catalog";

const STUDIO = { name: "Studio Verde" };
const FILE_ID = "1b4e28ba-2fa1-11d2-883f-0016d3cca427";

describe("buildNotification", () => {
  it.each([
    [
      "diet",
      "file_diet",
      "È disponibile il tuo nuovo piano alimentare.",
      "/app/diete",
    ],
    [
      "workout",
      "file_workout",
      "È disponibile la tua nuova scheda di allenamento.",
      "/app/allenamenti",
    ],
    [
      "report",
      "file_report",
      "È disponibile il tuo nuovo report.",
      "/app/report",
    ],
  ] as const)(
    "file %s: testo del catalogo, link alla categoria, tag per tipo",
    (category, type, body, url) => {
      expect(
        buildNotification({ type: "file", category, fileId: FILE_ID }, STUDIO),
      ).toEqual({
        type,
        title: "Studio Verde",
        body,
        icon: "/icon/192",
        url,
        tag: `files:${type}`,
      });
    },
  );

  it("promemoria: variante base se oggi c'è già un allenamento", () => {
    expect(
      buildNotification(
        { type: "daily_checkin", day: "2026-11-06", variant: "base" },
        STUDIO,
      ),
    ).toEqual({
      type: "daily_checkin",
      title: "Studio Verde",
      body: "Com'è andata oggi? Un minuto per passi, sonno e acqua.",
      icon: "/icon/192",
      url: "/app/tracking",
      tag: "checkin-2026-11-06",
    });
  });

  it("promemoria: senza allenamento oggi il testo lo ricorda", () => {
    expect(
      buildNotification(
        { type: "daily_checkin", day: "2026-11-06", variant: "workout" },
        STUDIO,
      ).body,
    ).toBe(
      "Com'è andata oggi? Un minuto per passi, sonno e acqua, e se ti sei allenato il voto dell'allenamento.",
    );
  });

  it("non contiene mai titolo, nota o id del file anche se l'evento li porta", () => {
    const event = {
      type: "file",
      category: "diet",
      fileId: FILE_ID,
      title: "Piano ipocalorico – diabete",
      note: "Ridurre gli zuccheri",
    } as NotificationEvent;
    const serialized = JSON.stringify(buildNotification(event, STUDIO));
    for (const forbidden of [
      "ipocalorico",
      "diabete",
      "zuccheri",
      "1b4e28ba",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});

describe("deduplicazione e registro", () => {
  it("file: una chiave per file; promemoria: una per cliente e giorno", () => {
    expect(
      dedupeKey({ type: "file", category: "report", fileId: FILE_ID }, "c1"),
    ).toBe(`file:${FILE_ID}`);
    expect(
      dedupeKey(
        { type: "daily_checkin", day: "2026-11-06", variant: "base" },
        "c1",
      ),
    ).toBe("checkin:c1:2026-11-06");
  });

  it("il payload del registro ha solo url, tag e riferimenti", () => {
    expect(
      logPayload({ type: "file", category: "diet", fileId: FILE_ID }),
    ).toEqual({ url: "/app/diete", tag: "files:file_diet", fileId: FILE_ID });
    expect(
      logPayload({
        type: "daily_checkin",
        day: "2026-11-06",
        variant: "workout",
      }),
    ).toEqual({
      url: "/app/tracking",
      tag: "checkin-2026-11-06",
      day: "2026-11-06",
    });
  });

  it("TTL: 24 ore per i file, 2 ore per il promemoria", () => {
    expect(
      notificationTtl({ type: "file", category: "diet", fileId: FILE_ID }),
    ).toBe(86_400);
    expect(
      notificationTtl({ type: "daily_checkin", day: "x", variant: "base" }),
    ).toBe(7_200);
  });

  it("badge statico per tipo", () => {
    expect(badgeUrl("daily_checkin")).toBe(
      "/notification-badges/daily_checkin.png",
    );
  });
});
