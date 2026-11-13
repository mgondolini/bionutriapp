import { describe, expect, it } from "vitest";

import { meetingUrlSchema, setSessionMeetingSchema } from "./journeys.schema";

const VALID = "https://meet.google.com/kqz-mdvr-hdp";
const INVALID_MESSAGE =
  "Inserisci un link Google Meet come https://meet.google.com/abc-defg-hij, senza altro dopo.";

describe("meetingUrlSchema", () => {
  it("accetta un link Meet nel formato standard, anche con spazi ai lati", () => {
    expect(meetingUrlSchema.parse(VALID)).toBe(VALID);
    expect(meetingUrlSchema.parse(`  ${VALID} `)).toBe(VALID);
  });

  it.each([
    ["host sbagliato", "https://zoom.us/kqz-mdvr-hdp"],
    ["sottodominio finto", "https://meet.google.com.evil.test/kqz-mdvr-hdp"],
    ["http", "http://meet.google.com/kqz-mdvr-hdp"],
    ["senza schema", "meet.google.com/kqz-mdvr-hdp"],
    ["parametri in coda", `${VALID}?authuser=1`],
    ["frammento in coda", `${VALID}#join`],
    ["barra finale", `${VALID}/`],
    ["codice corto", "https://meet.google.com/kqz-mdv-hdp"],
    ["codice con maiuscole", "https://meet.google.com/KQZ-MDVR-HDP"],
    ["codice con cifre", "https://meet.google.com/kq1-mdvr-hdp"],
    ["link di ricerca", "https://meet.google.com/lookup/abc"],
  ])("rifiuta: %s", (_, value) => {
    const result = meetingUrlSchema.safeParse(value);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(INVALID_MESSAGE);
  });
});

describe("link Meet di un check", () => {
  const sessionId = "aaaaaaaa-2222-4000-8000-000000000001";

  it("vuoto o null vale come nessun link", () => {
    expect(
      setSessionMeetingSchema.parse({ sessionId, meetingUrl: null }),
    ).toEqual({ sessionId, meetingUrl: null });
    expect(
      setSessionMeetingSchema.parse({ sessionId, meetingUrl: "  " }),
    ).toEqual({ sessionId, meetingUrl: null });
    expect(
      setSessionMeetingSchema.parse({ sessionId, meetingUrl: ` ${VALID} ` }),
    ).toEqual({ sessionId, meetingUrl: VALID });
  });

  it("rifiuta un link che non è Google Meet", () => {
    for (const meetingUrl of [
      "https://meet.google.com/abc",
      `${VALID}?authuser=1`,
    ]) {
      expect(
        setSessionMeetingSchema.safeParse({ sessionId, meetingUrl }).success,
      ).toBe(false);
    }
  });
});
