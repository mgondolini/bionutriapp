import { describe, expect, it } from "vitest";

import { buildNotification, type NotificationEvent } from "./payload";

describe("buildNotification", () => {
  // L'evento può portare con sé i dati del file: non devono mai finire nel testo
  const event = {
    type: "file_published",
    fileId: "1b4e28ba-2fa1-11d2-883f-0016d3cca427",
    title: "Piano alimentare ipocalorico – diabete",
    category: "diet",
    note: "Ridurre gli zuccheri",
  } as NotificationEvent;

  it("contiene solo nome dello studio, testo generico, icona e link a /app", () => {
    expect(buildNotification(event, { name: "Studio Verde" })).toEqual({
      title: "Studio Verde",
      body: "Hai un nuovo documento nella tua area riservata",
      icon: "/icon/192",
      url: "/app",
      tag: "file_published",
    });
  });

  it("non contiene mai titolo, categoria, nota o id del file", () => {
    const serialized = JSON.stringify(
      buildNotification(event, { name: "Studio Verde" }),
    ).toLowerCase();
    for (const forbidden of [
      "piano alimentare",
      "diabete",
      "diet",
      "dieta",
      "zuccheri",
      "1b4e28ba",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });
});
