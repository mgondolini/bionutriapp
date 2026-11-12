import { describe, expect, it } from "vitest";

import {
  buildSessions,
  planJourney,
  suggestComposition,
  type JourneyComposition,
} from "./composition";
import {
  addMonths,
  calculateSessionDates,
  journeyEndDate,
  monthsBetween,
} from "./dates";
import {
  eventEnd,
  googleCalendarUrl,
  outlookCalendarUrl,
  romeOffset,
  sessionMinutes,
} from "./calendar";
import { buildIcs } from "./ics";
import { meetingLinkText, resolveMeetingUrl } from "./meeting";
import { isReminderDue, reminderSlot, reminderTimes } from "./reminders";
import {
  deriveSessionState,
  firstOpenId,
  groupClosedSessions,
  journeyMonth,
  mergeCustomDates,
  planRecalc,
  sessionNames,
  type JourneySession,
} from "./sessions";

const YEAR: JourneyComposition = {
  durationMonths: 12,
  includeOnboarding: true,
  giftMode: "none",
};

function session(
  position: number,
  over: Partial<JourneySession> = {},
): JourneySession {
  return {
    id: `s${position}`,
    position,
    type: position === 0 ? "onboarding" : "check",
    calculatedDate: "2026-01-01",
    customDate: null,
    time: null,
    status: "todo",
    ...over,
  };
}

describe("date del percorso", () => {
  it("1 anno, 12 sessioni dal 14 aprile 2026 (esempio dei requisiti)", () => {
    expect(calculateSessionDates("2026-04-14", 12, 12)).toEqual([
      "2026-04-14",
      "2026-05-17",
      "2026-06-19",
      "2026-07-23",
      "2026-08-25",
      "2026-09-27",
      "2026-10-30",
      "2026-12-02",
      "2027-01-04",
      "2027-02-07",
      "2027-03-12",
      "2027-04-14",
    ]);
  });

  it("6 mesi, 6 sessioni dal 12 novembre 2026 (esempio dei requisiti)", () => {
    expect(calculateSessionDates("2026-11-12", 6, 6)).toEqual([
      "2026-11-12",
      "2026-12-18",
      "2027-01-23",
      "2027-03-01",
      "2027-04-06",
      "2027-05-12",
    ]);
  });

  it("fine mese: 31 agosto + 6 mesi si ferma all'ultimo giorno di febbraio", () => {
    expect(addMonths("2026-08-31", 6)).toBe("2027-02-28");
    expect(addMonths("2027-08-31", 6)).toBe("2028-02-29"); // bisestile
    expect(journeyEndDate("2026-08-31", 6)).toBe("2027-02-28");
    const dates = calculateSessionDates("2026-08-31", 6, 6);
    expect(dates[0]).toBe("2026-08-31");
    expect(dates.at(-1)).toBe("2027-02-28");
  });

  it("anno bisestile: 29 febbraio + 1 anno = 28 febbraio", () => {
    expect(addMonths("2028-02-29", 12)).toBe("2029-02-28");
    expect(calculateSessionDates("2028-02-29", 12, 12).at(-1)).toBe(
      "2029-02-28",
    );
  });

  it("l'ora legale non sposta i giorni (marzo e ottobre)", () => {
    // dal 1 marzo al 1 settembre: 184 giorni, passi da 36,8 attraverso il
    // cambio d'ora di fine marzo
    const dates = calculateSessionDates("2026-03-01", 6, 6);
    expect(dates[0]).toBe("2026-03-01");
    expect(dates.at(-1)).toBe("2026-09-01");
    expect(dates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))).toBe(true);
    // stesso calcolo attraverso il cambio d'ora di ottobre
    const autumn = calculateSessionDates("2026-10-20", 6, 6);
    expect(autumn[1]).toBe("2026-11-25");
    expect(autumn.at(-1)).toBe("2027-04-20");
  });

  it("mesi interi trascorsi", () => {
    expect(monthsBetween("2026-04-14", "2026-04-13")).toBe(0);
    expect(monthsBetween("2026-04-14", "2026-05-13")).toBe(0);
    expect(monthsBetween("2026-04-14", "2026-05-14")).toBe(1);
    expect(monthsBetween("2026-04-14", "2026-11-12")).toBe(6);
  });
});

describe("composizione", () => {
  it("6 mesi: onboarding + 5 check; 1 anno: onboarding + 11 check", () => {
    expect(
      buildSessions({ ...YEAR, durationMonths: 6 }).map((s) => s.type),
    ).toEqual(["onboarding", "check", "check", "check", "check", "check"]);
    expect(buildSessions(YEAR)).toHaveLength(12);
  });

  it("omaggio aggiunto: +1 sessione in testa; incluso: il primo check è omaggio", () => {
    const added = buildSessions({
      durationMonths: 6,
      includeOnboarding: false,
      giftMode: "added",
    });
    expect(added.map((s) => s.type)).toEqual([
      "gift",
      "check",
      "check",
      "check",
      "check",
      "check",
    ]);
    const included = buildSessions({
      durationMonths: 6,
      includeOnboarding: true,
      giftMode: "included",
    });
    expect(included.map((s) => s.type)).toEqual([
      "onboarding",
      "gift",
      "check",
      "check",
      "check",
      "check",
    ]);
  });

  it("da 5 a 13 sessioni", () => {
    expect(
      buildSessions({
        durationMonths: 6,
        includeOnboarding: false,
        giftMode: "none",
      }),
    ).toHaveLength(5);
    expect(
      buildSessions({
        durationMonths: 12,
        includeOnboarding: true,
        giftMode: "added",
      }),
    ).toHaveLength(13);
  });

  it("le date coprono tutte le sessioni, dall'inizio alla fine", () => {
    const plan = planJourney(
      { durationMonths: 6, includeOnboarding: false, giftMode: "added" },
      "2026-11-12",
    );
    expect(plan.map((s) => s.calculatedDate)).toEqual(
      calculateSessionDates("2026-11-12", 6, 6),
    );
  });

  it("suggerimento: estensione entro la soglia, ripresa oltre", () => {
    expect(suggestComposition(23, 60, 6)).toEqual({
      kind: "extension",
      includeOnboarding: false,
      giftMode: "added",
      durationMonths: 6,
      withinThreshold: true,
    });
    expect(suggestComposition(60, 60).kind).toBe("extension");
    expect(suggestComposition(61, 60, 12)).toEqual({
      kind: "resume",
      includeOnboarding: true,
      giftMode: "none",
      durationMonths: 12,
      withinThreshold: false,
    });
  });
});

describe("sessioni", () => {
  it("data effettiva: modificata se c'è, altrimenti calcolata", () => {
    const [a, b] = mergeCustomDates([
      session(1, { calculatedDate: "2026-12-02", customDate: "2026-12-05" }),
      session(0, { calculatedDate: "2026-11-01" }),
    ]);
    expect(a).toMatchObject({ id: "s0", date: "2026-11-01", modified: false });
    expect(b).toMatchObject({ id: "s1", date: "2026-12-05", modified: true });
  });

  it("prossima e in ritardo si calcolano da oggi", () => {
    const sessions = mergeCustomDates([
      session(0, { calculatedDate: "2026-10-01", status: "done" }),
      session(1, { calculatedDate: "2026-11-01" }),
      session(2, { calculatedDate: "2026-11-20", status: "skipped" }),
      session(3, { calculatedDate: "2026-12-01" }),
      session(4, { calculatedDate: "2027-01-01" }),
    ]);
    const today = "2026-11-12";
    const next = firstOpenId(sessions, today);
    expect(next).toBe("s3");
    expect(sessions.map((s) => deriveSessionState(s, today, next))).toEqual([
      "done",
      "overdue",
      "skipped",
      "next",
      "todo",
    ]);
    // oggi conta come "da oggi in poi"
    expect(firstOpenId(sessions, "2026-12-01")).toBe("s3");
  });

  it("nomi: lo staff vede l'omaggio, il cliente solo check numerati", () => {
    const sessions = [session(0, { type: "gift" }), session(1), session(2)];
    expect([...sessionNames(sessions, "staff").values()]).toEqual([
      { kind: "gift" },
      { kind: "check", number: 1 },
      { kind: "check", number: 2 },
    ]);
    expect([...sessionNames(sessions, "client").values()]).toEqual([
      { kind: "check", number: 1 },
      { kind: "check", number: 2 },
      { kind: "check", number: 3 },
    ]);
  });

  it("mese del percorso", () => {
    expect(journeyMonth("2026-04-14", 12, "2026-11-12")).toEqual({
      current: 7,
      total: 12,
    });
    expect(journeyMonth("2026-04-14", 12, "2026-01-01").current).toBe(1);
    expect(journeyMonth("2026-04-14", 6, "2028-01-01").current).toBe(6);
  });

  it("cliente: le chiuse più vecchie in una riga, l'ultima chiusa separata", () => {
    const sessions = [
      { status: "done" as const, id: "o" },
      { status: "done" as const, id: "c1" },
      { status: "skipped" as const, id: "c2" },
      { status: "done" as const, id: "c3" },
      { status: "todo" as const, id: "c4" },
    ];
    const { grouped, rest } = groupClosedSessions(sessions);
    expect(grouped.map((s) => s.id)).toEqual(["o", "c1", "c2"]);
    expect(rest.map((s) => s.id)).toEqual(["c3", "c4"]);
    expect(groupClosedSessions(sessions.slice(3)).grouped).toEqual([]);
  });
});

describe("ricalcolo", () => {
  const start = "2026-04-14";
  const existing = planJourney(YEAR, start).map((s) => ({
    id: `s${s.position}`,
    position: s.position,
    type: s.type,
    calculatedDate: s.calculatedDate,
    customDate: null as string | null,
    status: "todo" as const,
  }));

  it("la data modificata resta ferma, le altre si ricalcolano", () => {
    const withCustom = existing.map((s) =>
      s.position === 8 ? { ...s, customDate: "2027-01-11" } : s,
    );
    const plan = planRecalc(withCustom, YEAR, "2026-04-21");
    expect(plan.fixed).toEqual(["s8"]);
    expect(plan.recalculated).toHaveLength(11);
    expect(plan.recalculated).not.toContain("s8");
    expect(plan.updates.find((u) => u.id === "s1")?.calculatedDate).toBe(
      "2026-05-24",
    );
    expect(plan.inserts).toEqual([]);
    expect(plan.deletes).toEqual([]);
  });

  it("ripristino: senza data modificata torna alla calcolata", () => {
    const [restored] = mergeCustomDates([
      { ...session(8), calculatedDate: "2027-01-04", customDate: null },
    ]);
    expect(restored).toMatchObject({ date: "2027-01-04", modified: false });
  });

  it("da 1 anno a 6 mesi: le sessioni in più spariscono, bloccato se già chiuse", () => {
    const six = { ...YEAR, durationMonths: 6 as const };
    const plan = planRecalc(existing, six, start);
    expect(plan.updates).toHaveLength(6);
    expect(plan.deletes).toEqual(["s6", "s7", "s8", "s9", "s10", "s11"]);
    expect(plan.blocked).toBe(false);
    const done = existing.map((s) =>
      s.position === 7 ? { ...s, status: "done" as const } : s,
    );
    expect(planRecalc(done, six, start).blocked).toBe(true);
  });

  it("da 6 mesi a 1 anno: si aggiungono le sessioni mancanti", () => {
    const six = planJourney({ ...YEAR, durationMonths: 6 }, start).map((s) => ({
      id: `s${s.position}`,
      position: s.position,
      type: s.type,
      calculatedDate: s.calculatedDate,
      customDate: null,
      status: "todo" as const,
    }));
    const plan = planRecalc(six, YEAR, start);
    expect(plan.inserts.map((s) => s.position)).toEqual([6, 7, 8, 9, 10, 11]);
    expect(plan.updates.at(-1)?.calculatedDate).toBe("2026-09-27");
  });
});

describe("promemoria", () => {
  it("sera prima alle 18 e mattina alle 8", () => {
    expect(reminderTimes({ date: "2026-11-05", time: "10:30" })).toEqual([
      { kind: "reminder_day_before", day: "2026-11-04", hour: 18 },
      { kind: "reminder_same_day", day: "2026-11-05", hour: 8 },
    ]);
    expect(reminderTimes({ date: "2026-11-05", time: null })).toHaveLength(2);
  });

  it("niente promemoria del mattino se la sessione è prima delle 8", () => {
    expect(reminderTimes({ date: "2026-11-05", time: "07:30" })).toEqual([
      { kind: "reminder_day_before", day: "2026-11-04", hour: 18 },
    ]);
  });

  it("turno del cron dall'ora locale", () => {
    expect(reminderSlot({ day: "2026-11-04", hour: 18 })).toEqual({
      kind: "reminder_day_before",
      sessionDay: "2026-11-05",
    });
    expect(reminderSlot({ day: "2026-11-05", hour: 8 })).toEqual({
      kind: "reminder_same_day",
      sessionDay: "2026-11-05",
    });
    expect(reminderSlot({ day: "2026-11-05", hour: 12 })).toBeNull();
    expect(
      isReminderDue(
        { date: "2026-11-05", time: "07:00" },
        { kind: "reminder_same_day", sessionDay: "2026-11-05" },
      ),
    ).toBe(false);
  });
});

describe("file .ics", () => {
  const now = new Date("2026-11-12T09:00:00Z");
  const base = {
    uid: "s1@nutrify",
    title: "Check 6, Studio Verde",
    description: "Sessione del tuo percorso.",
    meetingUrl: null,
    durationMinutes: 30,
    now,
  };

  it("con l'ora: evento di 30 minuti nel fuso di Roma", () => {
    const ics = buildIcs({ ...base, date: "2026-11-05", time: "10:30" }, MEET);
    expect(ics).toContain("DTSTART;TZID=Europe/Rome:20261105T103000");
    expect(ics).toContain("DTEND;TZID=Europe/Rome:20261105T110000");
    expect(ics).toContain("SUMMARY:Check 6\\, Studio Verde");
    expect(ics).toContain("BEGIN:VTIMEZONE");
    expect(ics).not.toContain("LOCATION");
    expect(ics).not.toContain("ATTENDEE");
  });

  it("l'onboarding dura un'ora", () => {
    const ics = buildIcs(
      {
        ...base,
        date: "2026-11-05",
        time: "10:30",
        durationMinutes: sessionMinutes("onboarding"),
      },
      MEET,
    );
    expect(ics).toContain("DTEND;TZID=Europe/Rome:20261105T113000");
  });

  it("alle 23:45 finisce il giorno dopo", () => {
    const ics = buildIcs({ ...base, date: "2026-12-31", time: "23:45" }, MEET);
    expect(ics).toContain("DTEND;TZID=Europe/Rome:20270101T001500");
  });

  it("senza ora: evento di una giornata", () => {
    const ics = buildIcs({ ...base, date: "2026-12-31", time: null }, MEET);
    expect(ics).toContain("DTSTART;VALUE=DATE:20261231");
    expect(ics).toContain("DTEND;VALUE=DATE:20270101");
    expect(ics).not.toContain("VTIMEZONE");
  });

  it("con il link Meet e l'invito dello staff", () => {
    const ics = buildIcs(
      {
        ...base,
        date: "2027-01-11",
        time: "10:30",
        meetingUrl: URL_CLIENT,
        attendeeEmail: "giulia@example.test",
      },
      MEET,
    );
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain(`LOCATION:${URL_CLIENT}`);
    expect(unfolded).toContain(`URL:${URL_CLIENT}`);
    expect(unfolded).toContain(`${MEET} ${URL_CLIENT}`);
    expect(unfolded).toContain(
      "ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:giulia@example.test",
    );
    // RFC 5545: righe di al massimo 75 byte
    for (const line of ics.split("\r\n")) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});

const MEET = "Videochiamata su Google Meet:";
const URL_CLIENT = "https://meet.google.com/kqz-mdvr-hdp";
const URL_SESSION = "https://meet.google.com/abc-defg-hij";

describe("resolveMeetingUrl", () => {
  it("usa il link della sessione se c'è", () => {
    expect(
      resolveMeetingUrl(
        { meetingUrl: URL_SESSION },
        { meetingUrl: URL_CLIENT },
      ),
    ).toBe(URL_SESSION);
  });
  it("altrimenti quello del cliente", () => {
    expect(
      resolveMeetingUrl({ meetingUrl: null }, { meetingUrl: URL_CLIENT }),
    ).toBe(URL_CLIENT);
    expect(resolveMeetingUrl(null, { meetingUrl: URL_CLIENT })).toBe(
      URL_CLIENT,
    );
  });
  it("altrimenti nessun link", () => {
    expect(resolveMeetingUrl({ meetingUrl: null }, { meetingUrl: null })).toBe(
      null,
    );
    expect(resolveMeetingUrl(null, null)).toBe(null);
  });
  it("testo del link senza https", () => {
    expect(meetingLinkText(URL_CLIENT)).toBe("meet.google.com/kqz-mdvr-hdp");
  });
});

describe("link del calendario", () => {
  const event = {
    uid: "s1@nutrify",
    title: "Check 8 · G. Bianchi",
    description: "Sessione del percorso di Giulia Bianchi.",
    date: "2027-01-11",
    time: "10:30",
    durationMinutes: 30,
    meetingUrl: URL_CLIENT,
    attendeeEmail: "giulia@example.test",
  };

  it("Google Calendar: ora di Roma, 30 minuti, link e invito", () => {
    const url = new URL(googleCalendarUrl(event, MEET));
    expect(url.origin).toBe("https://calendar.google.com");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Check 8 · G. Bianchi");
    expect(url.searchParams.get("dates")).toBe(
      "20270111T103000/20270111T110000",
    );
    expect(url.searchParams.get("ctz")).toBe("Europe/Rome");
    expect(url.searchParams.get("location")).toBe(URL_CLIENT);
    expect(url.searchParams.get("details")).toContain(URL_CLIENT);
    expect(url.searchParams.get("add")).toBe("giulia@example.test");
  });

  it("Google Calendar senza ora né invito: giornata intera", () => {
    const url = new URL(
      googleCalendarUrl(
        { ...event, time: null, meetingUrl: null, attendeeEmail: null },
        MEET,
      ),
    );
    expect(url.searchParams.get("dates")).toBe("20270111/20270112");
    expect(url.searchParams.has("location")).toBe(false);
    expect(url.searchParams.has("add")).toBe(false);
  });

  it("Outlook: orari con lo scarto di Roma, ora solare e legale", () => {
    const winter = new URL(outlookCalendarUrl(event, MEET));
    expect(winter.searchParams.get("startdt")).toBe(
      "2027-01-11T10:30:00+01:00",
    );
    expect(winter.searchParams.get("enddt")).toBe("2027-01-11T11:00:00+01:00");
    expect(winter.searchParams.get("to")).toBe("giulia@example.test");
    const summer = new URL(
      outlookCalendarUrl({ ...event, date: "2026-07-01" }, MEET),
    );
    expect(summer.searchParams.get("startdt")).toBe(
      "2026-07-01T10:30:00+02:00",
    );
  });

  it("Outlook senza ora: giornata intera", () => {
    const url = new URL(outlookCalendarUrl({ ...event, time: null }, MEET));
    expect(url.searchParams.get("allday")).toBe("true");
    expect(url.searchParams.get("startdt")).toBe("2027-01-11");
    expect(url.searchParams.get("enddt")).toBe("2027-01-12");
  });

  it("scarto di Roma nei giorni del cambio d'ora", () => {
    expect(romeOffset("2026-03-29", "01:30")).toBe("+01:00");
    expect(romeOffset("2026-03-29", "03:30")).toBe("+02:00");
    expect(romeOffset("2026-10-25", "04:00")).toBe("+01:00");
  });

  it("durata: onboarding un'ora, check e omaggio 30 minuti", () => {
    expect(sessionMinutes("onboarding")).toBe(60);
    expect(sessionMinutes("check")).toBe(30);
    expect(sessionMinutes("gift")).toBe(30);
  });

  it("onboarding nei link: un'ora", () => {
    const onboarding = {
      ...event,
      title: "Onboarding · G. Bianchi",
      durationMinutes: 60,
    };
    expect(
      new URL(googleCalendarUrl(onboarding, MEET)).searchParams.get("dates"),
    ).toBe("20270111T103000/20270111T113000");
    expect(
      new URL(outlookCalendarUrl(onboarding, MEET)).searchParams.get("enddt"),
    ).toBe("2027-01-11T11:30:00+01:00");
  });

  it("fine dell'evento oltre la mezzanotte", () => {
    expect(eventEnd("2026-12-31", "23:45", 30)).toEqual({
      date: "2027-01-01",
      time: "00:15",
    });
  });
});
