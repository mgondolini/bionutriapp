import { describe, expect, it } from "vitest";

import {
  activeQuickFilter,
  filterClients,
  quickFilterCounts,
  quickFilterFilters,
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

describe("filtri rapidi", () => {
  it("conta ogni pill sull'elenco completo, con la ricerca applicata", () => {
    expect(quickFilterCounts(ITEMS, undefined)).toEqual({
      all: 5,
      in_progress: 2,
      onboarding: 2,
      invite_expired: 1,
    });
    expect(quickFilterCounts(ITEMS, "luca")).toEqual({
      all: 1,
      in_progress: 0,
      onboarding: 1,
      invite_expired: 1,
    });
  });

  it("una pill tiene la ricerca e azzera gli altri filtri", () => {
    expect(quickFilterFilters("onboarding", "anna")).toEqual({
      stage: "onboarding",
      query: "anna",
    });
    expect(quickFilterFilters("all", undefined)).toEqual({ query: undefined });
  });

  it("riconosce la pill selezionata dall'URL", () => {
    expect(activeQuickFilter({})).toBe("all");
    expect(activeQuickFilter({ query: "x" })).toBe("all");
    expect(activeQuickFilter({ stage: "in_progress" })).toBe("in_progress");
    expect(activeQuickFilter({ status: "invite_expired" })).toBe(
      "invite_expired",
    );
    // link vecchi con un'altra combinazione: nessuna pill selezionata
    expect(activeQuickFilter({ status: "active" })).toBeNull();
    expect(
      activeQuickFilter({ status: "invite_expired", stage: "onboarding" }),
    ).toBeNull();
  });
});
