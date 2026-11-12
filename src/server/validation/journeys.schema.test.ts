import { describe, expect, it } from "vitest";

import {
  clientMeetingFormSchema,
  meetingUrlSchema,
  setSessionMeetingSchema,
} from "./journeys.schema";

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

describe("link del cliente e della sessione", () => {
  it("il link del cliente vuoto vale come nessun link", () => {
    expect(clientMeetingFormSchema.parse({ meetingUrl: "  " })).toEqual({
      meetingUrl: null,
    });
    expect(clientMeetingFormSchema.parse({ meetingUrl: VALID })).toEqual({
      meetingUrl: VALID,
    });
    expect(
      clientMeetingFormSchema.safeParse({ meetingUrl: `${VALID}?x=1` }).success,
    ).toBe(false);
  });

  it("il link di una sessione è obbligatorio, null torna a quello del cliente", () => {
    const sessionId = "aaaaaaaa-2222-4000-8000-000000000001";
    expect(
      setSessionMeetingSchema.parse({ sessionId, meetingUrl: null }),
    ).toEqual({ sessionId, meetingUrl: null });
    expect(
      setSessionMeetingSchema.safeParse({ sessionId, meetingUrl: "" }).error
        ?.issues[0]?.message,
    ).toBe("Inserisci il link Google Meet di questo check.");
    expect(
      setSessionMeetingSchema.safeParse({
        sessionId,
        meetingUrl: "https://meet.google.com/abc",
      }).success,
    ).toBe(false);
  });
});
