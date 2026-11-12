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

  it("video: link al video, una chiave per video e cliente, solo riferimenti nel registro", () => {
    const event: NotificationEvent = {
      type: "video",
      videoId: "v-1",
      folderId: "f-1",
      folderName: "Ricette veloci",
    };
    expect(buildNotification(event, STUDIO)).toEqual({
      type: "video",
      title: "Studio Verde",
      body: "Nuovo video disponibile in Ricette veloci",
      icon: "/icon/192",
      url: "/app/video/f-1/v-1",
      tag: "videos",
    });
    expect(dedupeKey(event, "c1")).toBe("video:v-1:c1");
    expect(dedupeKey(event, "c2")).toBe("video:v-1:c2");
    expect(logPayload(event)).toEqual({
      url: "/app/video/f-1/v-1",
      tag: "videos",
      videoId: "v-1",
    });
    expect(notificationTtl(event)).toBe(86_400);
  });

  it("check delle misure: tracking, una chiave per cliente, data e momento", () => {
    const eve: NotificationEvent = {
      type: "measure_check",
      dueOn: "2026-12-01",
      when: "eve",
    };
    expect(buildNotification(eve, STUDIO)).toEqual({
      type: "measure_check",
      title: "Studio Verde",
      body: "Domani è il giorno del check: prepara metro e bilancia.",
      icon: "/icon/192",
      url: "/app/tracking",
      tag: "measure-check-2026-12-01",
    });
    expect(buildNotification({ ...eve, when: "day" }, STUDIO).body).toBe(
      "Oggi è il giorno del check: registra peso e circonferenze.",
    );
    expect(dedupeKey(eve, "c1")).toBe("measure_check:c1:2026-12-01:eve");
    expect(dedupeKey({ ...eve, when: "day" }, "c1")).toBe(
      "measure_check:c1:2026-12-01:day",
    );
    expect(notificationTtl(eve)).toBe(12 * 60 * 60);
  });

  it("badge statico per tipo", () => {
    expect(badgeUrl("daily_checkin")).toBe(
      "/notification-badges/daily_checkin.png",
    );
  });
});
