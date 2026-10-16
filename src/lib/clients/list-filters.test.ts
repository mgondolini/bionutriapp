import { describe, expect, it } from "vitest";

import {
  facetCounts,
  filterClients,
  type ClientListItem,
} from "./list-filters";

function item(
  partial: Partial<ClientListItem> & Pick<ClientListItem, "id">,
): ClientListItem {
  return {
    firstName: "Nome",
    lastName: null,
    phone: "+393330000000",
    email: null,
    accountStatus: "active",
    journeyStage: "in_progress",
    lastFile: null,
    lastEntryOn: null,
    ...partial,
  };
}

const ITEMS = [
  item({
    id: "1",
    firstName: "Anna",
    lastName: "Rossi",
    phone: "+393331234567",
    email: "anna.rossi@example.test",
  }),
  item({
    id: "2",
    firstName: "Marco",
    accountStatus: "active",
    journeyStage: "onboarding",
    phone: "+393330000002",
  }),
  item({
    id: "3",
    firstName: "Niccolò",
    lastName: "Verdi",
    accountStatus: "invited",
    phone: "+393330000003",
  }),
  item({
    id: "4",
    firstName: "Luca",
    accountStatus: "invite_expired",
    journeyStage: "onboarding",
  }),
  item({
    id: "5",
    firstName: "Sara",
    accountStatus: "to_invite",
    journeyStage: "paused",
  }),
];

const ids = (list: ClientListItem[]) => list.map((i) => i.id);

describe("filterClients", () => {
  it("filtra per stato account e per fase", () => {
    expect(ids(filterClients(ITEMS, { status: "active" }))).toEqual(["1", "2"]);
    expect(ids(filterClients(ITEMS, { stage: "onboarding" }))).toEqual([
      "2",
      "4",
    ]);
    expect(
      ids(filterClients(ITEMS, { status: "active", stage: "onboarding" })),
    ).toEqual(["2"]);
  });

  it("cerca per nome (anche cognome nome e senza accenti), email e telefono", () => {
    expect(ids(filterClients(ITEMS, { query: "rossi anna" }))).toEqual(["1"]);
    expect(ids(filterClients(ITEMS, { query: "niccolo" }))).toEqual(["3"]);
    expect(ids(filterClients(ITEMS, { query: "ANNA.ROSSI@" }))).toEqual(["1"]);
    expect(ids(filterClients(ITEMS, { query: "333 123" }))).toEqual(["1"]);
    expect(ids(filterClients(ITEMS, { query: "+39333123" }))).toEqual(["1"]);
    expect(ids(filterClients(ITEMS, { query: "  " }))).toHaveLength(5);
  });
});

describe("facetCounts", () => {
  it("senza filtri conta tutti i clienti per stato e per fase", () => {
    const counts = facetCounts(ITEMS, {});
    expect(counts.status).toEqual({
      all: 5,
      to_invite: 1,
      invited: 1,
      invite_expired: 1,
      active: 2,
      disabled: 0,
    });
    expect(counts.stage).toEqual({
      all: 5,
      onboarding: 2,
      in_progress: 2,
      paused: 1,
      completed: 0,
    });
  });

  it("ogni gruppo applica l'altro filtro e la ricerca, ma non il proprio", () => {
    const counts = facetCounts(ITEMS, {
      status: "active",
      stage: "onboarding",
    });
    // stati contati fra i clienti in Onboarding
    expect(counts.status).toMatchObject({
      all: 2,
      active: 1,
      invite_expired: 1,
    });
    // fasi contate fra i clienti attivi
    expect(counts.stage).toMatchObject({
      all: 2,
      onboarding: 1,
      in_progress: 1,
    });
  });
});
