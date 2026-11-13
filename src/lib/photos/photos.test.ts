import { describe, expect, it } from "vitest";

import {
  getPhotoCheckNumbers,
  isPhotoCheck,
  photoSessionsOfJourney,
} from "./checks";
import {
  checkPhotoInput,
  fitWithin,
  hasJpegSignature,
  jpegHasMetadata,
} from "./image";
import {
  canSavePhotoSet,
  getPhotoSetStatus,
  isOpenState,
  missingViews,
} from "./status";

describe("getPhotoCheckNumbers", () => {
  it("1 anno: check 3, 6 e 9", () => {
    expect(getPhotoCheckNumbers(12)).toEqual([3, 6, 9]);
  });
  it("6 mesi: solo il check 3 (l'ultimo check è il 5)", () => {
    expect(getPhotoCheckNumbers(6)).toEqual([3]);
  });
  it("isPhotoCheck", () => {
    expect(isPhotoCheck(6, 12)).toBe(true);
    expect(isPhotoCheck(6, 6)).toBe(false);
    expect(isPhotoCheck(4, 12)).toBe(false);
  });
});

describe("photoSessionsOfJourney", () => {
  const session = (
    position: number,
    type: "onboarding" | "check" | "gift",
  ) => ({
    id: `s${position}`,
    position,
    type,
  });

  it("l'onboarding ha le foto di partenza ed è escluso dalla numerazione", () => {
    const sessions = [
      session(0, "onboarding"),
      ...[1, 2, 3, 4, 5].map((p) => session(p, "check")),
    ];
    expect(photoSessionsOfJourney(sessions, 6)).toEqual([
      { session: sessions[0], checkNumber: null },
      { session: sessions[3], checkNumber: 3 },
    ]);
  });

  it("l'omaggio conta come un check (numerazione del cliente)", () => {
    const sessions = [
      session(0, "gift"),
      ...Array.from({ length: 11 }, (_, i) => session(i + 1, "check")),
    ];
    expect(
      photoSessionsOfJourney(sessions, 12).map((s) => [
        s.session.id,
        s.checkNumber,
      ]),
    ).toEqual([
      ["s2", 3],
      ["s5", 6],
      ["s8", 9],
    ]);
  });

  it("ordina per posizione", () => {
    const sessions = [
      session(3, "check"),
      session(1, "check"),
      session(2, "check"),
    ];
    expect(photoSessionsOfJourney(sessions, 6)[0]?.session.id).toBe("s3");
  });
});

describe("getPhotoSetStatus", () => {
  const base = {
    sessionDate: "2026-10-30",
    today: "2026-11-02",
    sessionStatus: "todo" as const,
    setStatus: null,
    views: [],
  };

  it("futuro fino a 4 giorni prima del check", () => {
    expect(getPhotoSetStatus({ ...base, today: "2026-10-26" })).toBe("future");
  });
  it("da caricare da 3 giorni prima del check", () => {
    expect(getPhotoSetStatus({ ...base, today: "2026-10-27" })).toBe(
      "to_upload",
    );
  });
  it("bozza con 1 o 2 foto, pronto con 3", () => {
    expect(
      getPhotoSetStatus({ ...base, setStatus: "draft", views: ["front"] }),
    ).toBe("draft");
    expect(
      getPhotoSetStatus({
        ...base,
        setStatus: "draft",
        views: ["front", "back"],
      }),
    ).toBe("draft");
    expect(
      getPhotoSetStatus({
        ...base,
        setStatus: "draft",
        views: ["front", "side", "back"],
      }),
    ).toBe("ready");
  });
  it("salvato vince su tutto", () => {
    expect(
      getPhotoSetStatus({
        ...base,
        setStatus: "saved",
        views: ["front", "side", "back"],
      }),
    ).toBe("saved");
  });
  it("check saltato senza foto: non si mostra; con foto resta in bozza", () => {
    expect(getPhotoSetStatus({ ...base, sessionStatus: "skipped" })).toBe(
      "skipped",
    );
    expect(
      getPhotoSetStatus({
        ...base,
        sessionStatus: "skipped",
        setStatus: "draft",
        views: ["side"],
      }),
    ).toBe("draft");
  });
  it("isOpenState", () => {
    expect(isOpenState("draft")).toBe(true);
    expect(isOpenState("saved")).toBe(false);
    expect(isOpenState("future")).toBe(false);
  });
});

describe("tre viste per salvare", () => {
  it("missingViews nell'ordine Fronte, Lato, Dietro", () => {
    expect(missingViews(["back"])).toEqual(["front", "side"]);
  });
  it("canSavePhotoSet solo con tutte e tre e non salvato", () => {
    expect(
      canSavePhotoSet({ setStatus: "draft", views: ["front", "side"] }),
    ).toBe(false);
    expect(
      canSavePhotoSet({ setStatus: "draft", views: ["front", "side", "back"] }),
    ).toBe(true);
    expect(
      canSavePhotoSet({ setStatus: "saved", views: ["front", "side", "back"] }),
    ).toBe(false);
  });
});

describe("immagini", () => {
  it("fitWithin riduce il lato lungo a 2000 px senza ingrandire", () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 2000, height: 1500 });
    expect(fitWithin(3024, 4032)).toEqual({ width: 1500, height: 2000 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("checkPhotoInput: formati e 10 MB", () => {
    expect(
      checkPhotoInput({ type: "image/jpeg", name: "a.jpg", size: 1000 }),
    ).toBeNull();
    expect(
      checkPhotoInput({ type: "", name: "IMG_1.HEIC", size: 1000 }),
    ).toBeNull();
    expect(
      checkPhotoInput({ type: "image/gif", name: "a.gif", size: 1000 }),
    ).toBe("unsupported");
    expect(
      checkPhotoInput({
        type: "image/png",
        name: "a.png",
        size: 10 * 1024 * 1024 + 1,
      }),
    ).toBe("too_large");
  });

  const soi = [0xff, 0xd8];
  const app0 = [0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46];
  const app1 = [0xff, 0xe1, 0x00, 0x04, 0x45, 0x78];
  const dqt = [0xff, 0xdb, 0x00, 0x03, 0x00];
  const sos = [0xff, 0xda, 0x00, 0x02];

  it("firma JPEG", () => {
    expect(hasJpegSignature(new Uint8Array([...soi, 0xff, 0xe0]))).toBe(true);
    expect(hasJpegSignature(new Uint8Array([0x89, 0x50, 0x4e]))).toBe(false);
  });

  it("jpegHasMetadata: JFIF senza EXIF passa", () => {
    expect(
      jpegHasMetadata(new Uint8Array([...soi, ...app0, ...dqt, ...sos])),
    ).toBe(false);
  });
  it("jpegHasMetadata: un blocco EXIF (APP1) viene rifiutato", () => {
    expect(
      jpegHasMetadata(new Uint8Array([...soi, ...app0, ...app1, ...sos])),
    ).toBe(true);
  });
  it("jpegHasMetadata: intestazione troncata = rifiutata", () => {
    expect(jpegHasMetadata(new Uint8Array([...soi, ...app0]))).toBe(true);
  });
});

describe("promemoria delle foto", () => {
  it("uno al giorno, alle 8", async () => {
    const { isPhotoReminderHour } = await import("./reminders");
    expect(isPhotoReminderHour(8)).toBe(true);
    expect(isPhotoReminderHour(18)).toBe(false);
  });
  it("testo prima della sessione, il giorno stesso e dopo", async () => {
    const { photoReminderMoment } = await import("./reminders");
    expect(photoReminderMoment("2026-10-30", "2026-10-27")).toBe("before");
    expect(photoReminderMoment("2026-10-30", "2026-10-30")).toBe("same_day");
    expect(photoReminderMoment("2026-10-30", "2026-11-02")).toBe("after");
  });
});
